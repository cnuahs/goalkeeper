// GoalKeeper app for slack... message formatting

// 2018-03-12 - Shaun L. Cloherty <s.cloherty@ieee.org>

function mkHelpMsg() {
  // build the help action response

  var attachment = {
    color: "good",
    text: "Use `/goal` to manage your writing goal. For example:",
    fields: [
      {
        value: "* `/goal` Write something.\n* `/goal`\n* `/goal @user`\n",
        short: true
      },
      {
        value: "will set a new goal.\nwill return your current goal.\nwill return @user's goal.\n",
        short: true
      },
      {
        value: "Comments or questions: <@" + feedbackUid() + ">.",
        short: false
      }
    ],
    mrkdwn_in: ["text","fields"]
  };

  return ( {
    response_type: "ephemeral",
    text: "",
    attachments: [ attachment ]
  } );
}

function mkHelpAttachment(msg) {
  return ({
    color: "good",
    text: msg,
    mrkdwn_in: ["text"]
  })
}

function mkConnectMsg() {
  // build the connect action response

  var attachment = {
    fallback: "Click to connect.",
    color: "good",
    text: "Click the button below to connect with the GoalKeeper...",
    callback_id: "connect_button",
    actions: [ {
        type: "button",
        text: "Connect",
        name: "connect",
        value: "connect",
    } ],
    mrkdn_in: [ "text" ]
  };

  return ( {
    response_type: "ephemeral",
    text: "You have goals? Awesome!",
    attachments: [ attachment ]
  } );
}

function mkUserErrorMsg() {
  return mkErrorMsg("I don't know you... try `/goal connect` so we can get aquainted.");
}

function mkErrorMsg(msg) {
  return ( {
    response_type: "ephemeral",
    text: "",
    attachments: [ mkErrorAttachment(msg) ]
  } );
}

function mkErrorAttachment(msg) {
  return ({
    color: "danger",
    text: "*Error*:\n" + msg,
    mrkdwn_in: ["text"]
  })
}

function mkGeneralMsg(msg,inChannel) {
  var response_type = "ephemeral"
  if (inChannel) {
    response_type = "in_channel";
  }

  return ( {
    response_type: response_type,
    text: msg
  } );
}
