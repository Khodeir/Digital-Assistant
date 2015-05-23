import json

import tweepy
import yaml


# Authentication details. To  obtain these visit dev.twitter.com
f = open('config.yaml')
config = yaml.load(f)
consumer_key = config['twitter']['consumer_key']
consumer_secret = config['twitter']['consumer_secret']
access_token = config['twitter']['access_token']
access_token_secret = config['twitter']['access_token_secret']

class StdOutListener(tweepy.StreamListener):
    def on_data(self, data):
        # Twitter returns data in JSON format - we need to decode it first
        decoded = json.loads(data)
        print(decoded)
        return True

    def on_error(self, status):
        print(status)


if __name__ == '__main__':
    l = StdOutListener()
    auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
    auth.set_access_token(access_token, access_token_secret)
    stream = tweepy.Stream(auth, l)
    stream.filter(track=['projectfeelings'])