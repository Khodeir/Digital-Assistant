SUCCESS = 'success'
import os
from datetime import datetime
from flask import Flask, abort, request, jsonify, g, url_for, render_template, make_response
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.httpauth import HTTPBasicAuth
from passlib.apps import custom_app_context as pwd_context
from itsdangerous import (TimedJSONWebSignatureSerializer
                          as Serializer, BadSignature, SignatureExpired)
from flask.ext.script import Manager
from flask.ext.migrate import Migrate, MigrateCommand
import sqlalchemy as sa

# initialization
app = Flask(__name__)
app.config['SECRET_KEY'] = 'the quick brown fox jumps over the lazy dog'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_COMMIT_ON_TEARDOWN'] = True

# extensions
db = SQLAlchemy(app)
auth = HTTPBasicAuth()
migrate = Migrate(app, db)
manager = Manager(app)
manager.add_command('db', MigrateCommand)

# models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), index=True)
    password_hash = db.Column(db.String(64))

    def hash_password(self, password):
        self.password_hash = pwd_context.encrypt(password)

    def verify_password(self, password):
        return pwd_context.verify(password, self.password_hash)

    def generate_auth_token(self, expiration=600):
        s = Serializer(app.config['SECRET_KEY'], expires_in=expiration)
        return s.dumps({'id': self.id})

    @staticmethod
    def verify_auth_token(token):
        # from IPython import embed
        # embed()
        s = Serializer(app.config['SECRET_KEY'])
        try:
            data = s.loads(token)
        except SignatureExpired:
            return None    # valid token, but expired
        except BadSignature:
            return None    # invalid token
        user = User.query.get(data['id'])
        return user

    def get_goals(self):
        return Goal.query.filter_by(user_id=self.id).all()

    def get_history(self, since=None):

        x = History.query.filter_by(user_id=self.id)
        if since:
            x = x.filter(History.time >= since)
        return x.all()



    def get_tasks(self):
        return Task.query.filter(
                        Task.goal_id.in_(
                            map(lambda x: x.id, 
                                self.get_goals()))).all()
    def get_task_by(self, kwargs):
        return Task.query.filter(
                        Task.goal_id.in_(
                            map(lambda x: x.id, 
                                self.get_goals()))).filter_by(**kwargs).all()

    def get_goal_by(self, kwargs):
        return Goal.query.filter_by(user_id=self.id,**kwargs).all()



class History(db.Model):
    __tablename__ = 'history'

    time = db.Column(db.DateTime, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'),primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))
    valence = db.Column(db.Float)
    intensity = db.Column(db.Float)
    user = db.relationship('User',
        backref=db.backref('history', lazy='dynamic'))
    task = db.relationship('Task',
        backref=db.backref('history', lazy='dynamic'))

    def get_task(self):
        return self.task or Task()

    def get_dict(self):
        return {'task' : self.get_task().get_dict(),'valence':self.valence, 
        'intensity':self.intensity, 'time': self.time}

class Goal(db.Model):
    __tablename__ = 'goals'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), index=True)
    weight = db.Column(db.Float)

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship('User',
        backref=db.backref('goals', lazy='dynamic'))

    def get_dict(self):
        return {'name': self.name ,'weight' : self.weight, 'gid' : self.id}



class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), index=True)
    done = db.Column(db.Boolean(), default=False, 
        server_default=sa.sql.expression.false())

    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'))
    goal = db.relationship('Goal',
        backref=db.backref('tasks', lazy='dynamic'))

    def get_goal(self):
        return self.goal or Goal()

    def get_dict(self):
        return {'tid': self.id, 'name': self.name ,'goal': self.get_goal().name, 'done': self.done} 

# routines 
@app.route('/api/v1/token', methods=['GET'])
@auth.login_required
def get_auth_token():
    token = g.user.generate_auth_token(600)
    return jsonify({'token': token.decode('ascii'), 'user':g.user.username,'duration': 600})

@auth.error_handler
def handle_unauth():
    res = make_response("Unauthorized Access")
    res.status_code = 403
    return res

@app.route('/api/v1/token', methods=['POST'])
def verify_token():
    token = request.authorization['username']
    valid = bool(User.verify_auth_token(token))
    return jsonify({'valid': valid})


@auth.verify_password
def verify_password(username_or_token, password):
    # first try to authenticate by token
    user = User.verify_auth_token(username_or_token)
    if not user:
        # try to authenticate with username/password
        user = User.query.filter_by(username=username_or_token).first()
        if not user or not user.verify_password(password):
            return False
    g.user = user
    return True


@app.route('/api/v1/users', methods=['POST'])
def new_user():
    username = request.json.get('username')
    password = request.json.get('password')
    if username is None or password is None:
        abort(400)    # missing arguments
    if User.query.filter_by(username=username).first() is not None:
        abort(400)    # existing user
    user = User(username=username)
    user.hash_password(password)
    db.session.add(user)
    db.session.commit()
    return (jsonify({'username': user.username}), 201,
            {'Location': url_for('main', _external=True)})


@app.route('/api/v1/tasks', methods=['GET'])
@auth.login_required
def get_tasks():
    tasks = [t.get_dict() for t in g.user.get_tasks()]
    return jsonify({'tasks': tasks})

@app.route('/api/v1/tasks', methods=['POST'])
@auth.login_required
def post_task():
    tid = request.json.get('tid')
    name = request.json.get('name')
    goalname = request.json.get('goal')
    done = request.json.get('done') or False

    if name is None or goalname is None or done is None:
        abort(400)    # missing arguments

    goal = g.user.get_goal_by({'name':goalname})
    
    if not goal:
        abort(400)    # invalid goal
    assert len(goal) == 1
    goal = goal[0]
    
    # if this is an edit look for appropriate task
    if tid:
        t = g.user.get_task_by({'id':tid})
        assert len(t) == 1
        t = t[0]

    elif g.user.get_task_by({'name':name}):
        abort(400) #existing task
    else:
        t = Task()
    t.name = name
    t.goal_id = goal.id
    t.done = done

    db.session.add(t)
    db.session.commit()

    return jsonify({'status': SUCCESS})

@app.route('/api/v1/goals', methods=['GET'])
@auth.login_required
def get_goals():
    goals = [t.get_dict() for t in g.user.get_goals()]
    return jsonify({'goals': goals})

@app.route('/api/v1/goals', methods=['POST'])
@auth.login_required
def post_goal():
    gid = request.json.get('gid')
    name = request.json.get('name')
    weight = request.json.get('weight')
    if name is None or weight is None:
        abort(400)    # missing arguments

    # if this is an edit look for appropriate goal
    if gid:
        goal = g.user.get_goal_by({'id':gid})
        assert len(goal) == 1
        goal = goal[0]
    elif g.user.get_goal_by({'name':name}):
        abort(400) #existing goal
    else:
        goal = Goal(user_id=g.user.id)


    
    goal.name = name
    goal.weight = weight

    db.session.add(goal)
    db.session.commit()

    return jsonify({'status': SUCCESS})
@app.route('/api/v1/history', methods=['POST'])
@auth.login_required
def post_history():
    valence = request.json.get('valence')
    intensity = request.json.get('intensity')
    task_id = request.json.get('tid') or None
    time = request.json.get('time')

    if time:
        time = datetime.strptime(time, "%a, %d %b %Y %H:%M:%S %Z")
    else:
        time = datetime.now()

    t = History.query.filter_by(user_id=g.user.id, time=time).first() \
        or History(user_id=g.user.id, time=time)

    if valence:
        t.valence = valence
    if intensity:
        t.intensity = intensity
    if task_id:
        t.task_id = task_id

    db.session.add(t)
    db.session.commit()
    return jsonify({'status': SUCCESS})

@app.route('/api/v1/history', methods=['GET'])
@auth.login_required
def get_todayshistory():
    date_string = request.args.get('day')
    if date_string:
        time = datetime.strptime(date_string, "%a, %d %b %Y %H:%M:%S %Z")
        history_objects = g.user.get_history(since=time)
    else:
        history_objects = g.user.get_history()

    history = [h.get_dict() for h in history_objects]

    return jsonify({'history':history})


@app.route('/')
def main():
    return render_template('home.html')


if __name__ == '__main__':
    if not os.path.exists('db.sqlite'):
        db.create_all()
    # from OpenSSL import SSL
    # context = SSL.Context(SSL.SSLv23_METHOD)
    # context.use_privatekey_file('yourserver.key')
    # context.use_certificate_file('yourserver.crt')
    manager.run()#, ssl_context=context)
