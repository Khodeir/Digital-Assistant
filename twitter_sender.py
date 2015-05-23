import time

import tweepy
import yaml


f = open('config.yaml')
config = yaml.load(f)
consumer_key = config['twitter']['consumer_key']
consumer_secret = config['twitter']['consumer_secret']
access_token = config['twitter']['access_token']
access_token_secret = config['twitter']['access_token_secret']
users = ['projfeelings1']

# Establish connection with twitter
auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_token_secret)
api = tweepy.API(auth)

while True:
    for user in users:
        api.send_direct_message(text=
                                'Valence: (-10: world is shit, 10: everything is awesome\n'
                                'Energy: (-10: hungover, 10: veins popping\n'
                                'Activity: ',
                                screen_name=user)
        print('sleeping for 1 hour')
        time.sleep(3600)