SUCCESS = 'success'
import os
from datetime import datetime
from flask import Flask, abort, request, jsonify, g, url_for, render_template
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.httpauth import HTTPBasicAuth
from passlib.apps import custom_app_context as pwd_context
from itsdangerous import (TimedJSONWebSignatureSerializer
                          as Serializer, BadSignature, SignatureExpired)

# initialization
app = Flask(__name__)
app.config['SECRET_KEY'] = 'the quick brown fox jumps over the lazy dog'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_COMMIT_ON_TEARDOWN'] = True

# extensions
db = SQLAlchemy(app)
auth = HTTPBasicAuth()

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

    def get_tasks(self):
        return Task.query.filter(
                        Task.goal_id.in_(
                            map(lambda x: x.id, 
                                self.get_goals()))).all()

class History(db.Model):
    __tablename__ = 'history'
    id = db.Column(db.Integer, primary_key=True)
    time = db.Column(db.DateTime)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'))
    valence = db.Column(db.Float)
    intensity = db.Column(db.Float)

class Goal(db.Model):
    __tablename__ = 'goals'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), index=True)
    weight = db.Column(db.Float)

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship('User',
        backref=db.backref('posts', lazy='dynamic'))


class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), index=True)

    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id'))
    goal = db.relationship('Goal',
        backref=db.backref('posts', lazy='dynamic'))


# routines 
@app.route('/api/v1/token', methods=['GET'])
@auth.login_required
def get_auth_token():
    token = g.user.generate_auth_token(600)
    return jsonify({'token': token.decode('ascii'), 'user':g.user.username,'duration': 600})

@app.route('/api/v1/token', methods=['POST'])
def verify_token():
    token = request.authorization['username']
    print token

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
    tasks = [{'tid': t.id, 'name': t.name ,'goal': t.goal.name} for t in g.user.get_tasks()]
    return jsonify({'tasks': tasks})

@app.route('/api/v1/tasks', methods=['POST'])
@auth.login_required
def post_task():
    tid = request.json.get('tid')
    name = request.json.get('name')
    goalname = request.json.get('goal')

    if name is None or goalname is None:
        abort(400)    # missing arguments

    # if this is an edit look for appropriate task
    if tid and (tid not in map(lambda x: x.id, g.user.get_tasks())): 
        abort(400)    # invalid tid

    if goalname and (goalname not in map(lambda x: x.name, g.user.get_goals())):
        abort(400)    # invalid goal
    
    if filter(lambda x: x.name == name, g.user.get_tasks()):
        abort(400)    # existing task

    t = Task(name=name, goal_id=Goal.query.filter_by(name=goalname).first().id)
    db.session.add(t)
    db.session.commit()
    return jsonify({'status': SUCCESS})

@app.route('/api/v1/goals', methods=['GET'])
@auth.login_required
def get_goals():
    goals = [{'name': t.name ,'weight' : t.weight} for t in g.user.get_goals()]
    return jsonify({'goals': goals})

@app.route('/api/v1/goals', methods=['POST'])
@auth.login_required
def post_goal():
    gid = request.json.get('gid')
    name = request.json.get('name')
    weight = request.json.get('weight')

    if name is None or weight is None:
        abort(400)    # missing arguments

    # if this is an edit look for appropriate task
    if gid and (gid not in map(lambda x: x.id, g.user.get_goals())): 
        abort(400)    # invalid gid
    
    if filter(lambda x: x.name == name, g.user.get_goals()):
        abort(400)    # existing goal
    
    t = Goal(name=name, weight=weight, user_id=g.user.id)
    db.session.add(t)
    db.session.commit()
    return jsonify({'status': SUCCESS})

@app.route('/api/v1/history', methods=['POST'])
@auth.login_required
def post_history():
    valence = request.json.get('valence')
    intensity = request.json.get('intensity')
    task_id = request.json.get('task_id')
    time = datetime.now()

    if task_id is None:
        abort(400)    # missing arguments
    
    t = History(time=time, task_id=task_id,valence=valence,intensity=intensity)
    db.session.add(t)
    db.session.commit()
    return jsonify({'status': SUCCESS})


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
    app.run(debug=True)#, ssl_context=context)
