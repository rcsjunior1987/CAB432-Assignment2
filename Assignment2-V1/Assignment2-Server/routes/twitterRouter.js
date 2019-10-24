const express = require('express');
const router = express.Router();

// to do replace keys with env vars or config file
const Twitter = require('twitter');
const client = new Twitter({
  consumer_key: 'oKVH5nvDsrg80ukJ8LdjUKUg3',
  consumer_secret: 'FS3FlUCmgUtc9TUJ29M3SM6FyFyZ28bGAipjK67N0GsB5Gdpa8',
  access_token_key: '1181039439675412481-zXRgkfl5Sr30GlHm77xBihP4TNfgDV',
  access_token_secret: 'Otk1RnnFfZksxLpDe9cDtf0Olxr3BxCRvgYcOHee2lfNB'
});

const { SentimentManager, Language } = require('node-nlp');
const sentiment = new SentimentManager();
const language = new Language();

router.get('/:query', async (req, res) => {
  if (req.params.query) {
    try {
      const tweets = await getTwitterData(req.params.query);
      const data = await processTweets(tweets);
      return res.json(data);
    } catch (e) {
      next(e); // this will end up in the error handler
    }
  } else {
    res.send('respond with a resource');
  }
});

async function getTwitterData(query){
  return new Promise(function(resolve,reject){
    let data = [];

    client.get('search/tweets', {q:"#"+query, count:100}, function(error, tweets) {
      if (!error) {
        for(i = 0; i < tweets.statuses.length; i++){
            data.push(tweets["statuses"][i]["text"]);
        }
        resolve(data);
      } else {
        reject(error);
      }
    });
  });
}

async function processTweets(tweets){ // guess lang and check sentiment
  let data = [];
  let langQueue = [];
  let sentimentQueue = [];

  tweets.forEach(function(tweet){
    langQueue.push(guessLanguage(tweet));
  });

  const langResults = await Promise.all(langQueue);
  for (const langResult of langResults) {
    sentimentQueue.push(getSentiment(langResult));
  }

  const sentimentResults = await Promise.all(sentimentQueue);
  for (const sentimentResult of sentimentResults) {
    data.push(sentimentResult);
  }

  return data;
}

async function getSentiment(tweet){
  return new Promise(function(resolve,reject){
    sentiment
      .process(tweet[1],tweet[0]) // language, tweet body
      .then(function(result){
        data = [tweet[0],tweet[1],result["vote"]];
        resolve(data); // body, lang, sentiment
      })
      .catch(function(e){
        reject(e);
      });
  });
}

async function guessLanguage(tweet){
  return new Promise(function(resolve,reject){
    try {
      const guess = language.guess(tweet, null, 1); // limit result to 1
      resolve([tweet,guess[0]["alpha2"]]); // return alpha2 code
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = router;