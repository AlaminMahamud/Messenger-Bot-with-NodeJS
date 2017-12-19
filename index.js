'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  request = require('request'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()),
  PAGE_ACCESS_TOKEN = 'EAAFg1TC3Oc4BALo6b75cO0j1Ls0BVADblr24JgbenhmOpzffIRrsw7RTryYIXpy2u9nSzBdAb9zdDnS0HWl9AV5aofjuqZCdoWnDGb8AxQj7hpS4bWwLtSHpNJcCedvhymDRervBfgxYp6YJJarDCTn8Tk1DCKPOmkdKQmnsKrxUh0e9g',
  VERIFY_TOKEN2='4991994';
// Sets server port and logs message on success
app.listen(process.env.PORT || 1994, () => console.log('webhook is listening on PORT 1994'))

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }

    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET Requests to our webhook
app.get('/webhook', (req, res) => {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = VERIFY_TOKEN2;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }

});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // check if the messsage contains text
  if(received_message.text){

    // Creates the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    response = {
      "text": "Hi",
  "persistent_menu":[
    {
      "locale":"default",
      "composer_input_disabled": true,
      "call_to_actions":[
        {
          "title":"My Account",
          "type":"nested",
          "call_to_actions":[
            {
              "title":"Pay Bill",
              "type":"postback",
              "payload":"PAYBILL_PAYLOAD"
            },
            {
              "type":"web_url",
              "title":"Latest News",
              "url":"https://www.messenger.com/",
              "webview_height_ratio":"full"
            }
          ]
        }
      ]
    }
  ]
}

  } else if(received_message.attachments){

    // Gets the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;

    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Some Demo things",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Quick Replies!",
                "payload": "qr",
              },
              {
                "type": "postback",
                "title": "call button",
                "payload": "cb",
              },
              {
                "type": "postback",
                "title": "Button Template",
                "payload": "bt",
              }
            ],
          }]
        }
      }
    }

  }

  // Sends the response message
  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;

  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'qr') {
    response = {
    "text": "Here's a quick reply!",
    "quick_replies":[
      {
        "content_type":"text",
        "title":"Search",
        "payload":"search",
        "image_url":"http://example.com/img/red.png"
      },
      {
        "content_type":"location"
      },
      {
        "content_type":"text",
        "title":"Something Else",
        "payload":"something else"
      }
    ]
  }
  } else if (payload === 'cb') {
    response = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"button",
          "text":"Need further assistance? Talk to a representative",
          "buttons":[
            {
              "type":"phone_number",
              "title":"Call Representative",
              "payload":"+8801677902690"
            }
          ]
        }
      }
    }
  } else if (payload === 'bt') {
       response = {
    "attachment":{
      "type":"template",
      "payload":{
        "template_type":"button",
        "text":"What do you want to do next?",
        "buttons":[
          {
            "type":"web_url",
            "url":"https://www.messenger.com",
            "title":"Visit Messenger"
          },
        ]
      }
    }
  }
  }

  // else if (payload === '+8801677902690'){
  //   response = {}
  // }

  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "messaging_type": "RESPONSE",
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

function messenger_profile_api(response){
  request({
    "uri": "https://graph.facebook.com/v2.6/me//messenger_profile",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": response
  }, (err, res, body) => {
    if (!err) {
      console.log('all sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}
