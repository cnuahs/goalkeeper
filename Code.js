// bare bones slash command handler for slack...

// POST payloads from slack slash commands contain the following parameters:
//
//   user_name: shaunc
//   trigger_id: 323566020866.140237611429.d0b91a86770f6d14f4f35304f6be858c
//   user_id: U444CRH8S
//   team_id: T446ZHZCM
//   response_url: https://hooks.slack.com/commands/T446ZHZCM/324617447287/H6jQI1o93lOIrQBBnvVdvAj5
//   channel_name: zapier
//   token: SLACK VERIFICATION TOKEN
//   team_domain: marmolab
//   command: /goal
//   channel_id: C9H2SGDAB
//   text: my new goal

// 2018-03-02 - Shaun L. Cloherty <s.cloherty@ieee.org>

function doPost(payload) {

  if (payload.parameter.token != slackToken()) {
    var err = { text: "",
                attachments: [ mkErrorAttachment("Verification failed.") ] };

    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
  }

  var uid = payload.parameter.user_id;
  var uname = payload.parameter.user_name;
  var args = payload.parameter.text;

  switch (payload.parameter.command) {
    case "/goal":
      return goalHandler(uid,uname,args);
      break;
    case "/score":
      return scoreHandler(uid,uname,args);
      break;
  }

  // shouldn't be possible to end up here...
  return ContentService.createTextOutput("Got POST on "+ new Date() + " for " + payload.parameter.command + ".");
}

function goalHandler(uid,uname,args) {
  // handler for /goal commands

  // possible variants:
  //
  //   /goal <-- return current goal (user only, not displayed in channel)
  //   /goal @user <-- return current goal for @user (user only, not in channel)
  //   /goal new goal <-- set current goal to 'new goal' (shows in channel)
  //   /goal @user new goal <-- set current goal for @user (shows in channel)?
  //
  // so, args should be a string like: "<@U444CRH8S|shaunc> shaun's new goal"

  // var goal = "undefined";
  //
  // var re = /.*(<@U.*>).*/; // regexp, match <@Uxxxxxxxx|xxxxxxxx>
  // if (re.test(args)) {
  //   re = /.*<@(U\w+)\|(\w+)>\s*(.*)?/; // regexp
  //   var tokens = re.exec(args);
  //
  //   uid = tokens[1];
  //   uname = tokens[2];
  //   goal = tokens[3];
  // } else {
  //   re = /\s*(.*)?/; // regexp
  //   var tokens = re.exec(args);
  //
  //   goal = tokens[1];
  // }

  args = parseArgs(args);
  if (args.uid) {
    uid = args.uid;
  }
  if (args.uname) {
    uname = args.uname;
  }

  var result = "uid: " + uid + ", uname: " + uname;
  if (args.body) {
    // setting goal

    // set goal in Google sheet

    result = result + ", goal: " + args.body;
  } else {
    // querying goal

    // get goal from Google sheet

  }

  return ContentService.createTextOutput(result);
}

function scoreHandler(uid,uname,args) {
  // handler for /score commands

  // possible variants:
  //
  //   /score <-- return current users score (user only, not in channel)
  //   /score @user <-- return the score for @user (user only, not in nchannel)
  //   /score @user score <-- set the score for @user (note: cannot set your own score) (shows in channel)
}

function parseArgs(args) {
  // parse slash command arguments

  // args is likely a string like: "<@U444CRH8S|shaunc> shaun's new goal"

  //defaults: undefined
  var uid = null;
  var uname = null;
  var body = null;

  var re = /.*(<@U.*>).*/; // regexp, match <@Uxxxxxxxx|xxxxxxxx>
  if (re.test(args)) {
    re = /.*<@(U\w+)\|(\w+)>\s*(.*)?/; // regexp
    var tokens = re.exec(args);

    uid = tokens[1];
    uname = tokens[2];

    if (typeof(tokens[3]) != "undefined") {
      body = tokens[3];
    }
  } else {
    re = /\s*(.*)?/; // regexp
    var tokens = re.exec(args);

    if (typeof(tokens[1]) != "undefined") {
      body = tokens[1];
    }
  }

  return ({uid: uid, uname: uname, body: body});
}



function mkErrorAttachment(msg) {
  return ({
    color: "danger",
    text: "*Error*:\n" + msg,
    mrkdwn_in: ["text"]
  })
}
