// GoalKeeper app for slack...

// 2018-03-04 - Shaun L. Cloherty <s.cloherty@ieee.org>

function doPost(e) {
  // HTTP POST endpoint
  if (e.parameter.hasOwnProperty("payload")) {
    // this is an interactive message... payload is json
    var response = msgHandler(JSON.parse(e.parameter.payload));
  } else {
    // this is a slash command
    var response = cmdHandler(e.parameter);
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function msgHandler(payload) {
  // handler for slack interactive messages
  //
  // POST payloads from slack interactive messages contain the following:
  //
  //   payload = {
  //     type: "interactive_message",
  //     actions: [{name: "~", type: "~", value: "~"}],
  //     callback_id: "~",
  //     team: {id: "Txxxxxxxx",domain: "~"},
  //     channel: {id: "Cxxxxxxxx", name: "~"},
  //     user: {id: "Uxxxxxxxx", name: "~"},
  //     action_ts: "~",
  //     message_ts: "~",
  //     attachment_id: "~",
  //     token: "~",
  //     is_app_unfurl: true/false,
  //     response_url: "~",
  //     trigger_id: "~"
  //    }

  if (payload.token != slackToken()) {
    return mkErrorMsg("Verification failed.");
  }

  var msg = {
    response_type: "ephemeral",
    text: "Ok, got it!"
  };

  // adduser() can take a while, longer than the 3s slack allows for
  // a response. To avoid the user getting a timeout/failure message,
  // here we respond straight away, and *then* call addUser().
  //
  // I don't think this is a sanctioned use of the response_url... we
  // should be responding with an empty HTTP 200, but Google's Apps
  // Script is synchronous so I'm fudging it
  var response = postToUrl(payload.response_url,msg);

  addUser(payload.user.id,payload.user.name);

//  msg = {
//    response_type: "ephemeral",
//    text: "",
//    attachment: {
//      fallback: "Connected!",
//      color: "good",
//      text: "Connected!",
//      mrkdn_in: [ "text" ]
//    }
//  };
//
//  response = postToUrl(payload.response_url,msg);

//  return mkGeneralMsg("Ok, got it!");
}

function cmdHandler(payload) {
  // handler for slack slash commands
  //
  // POST payloads from slack slash commands contain the following:
  //
  //   payload = {
  //     user_name: "~"
  //     trigger_id: "~"
  //     user_id: "Uxxxxxxxx"
  //     team_id: "Txxxxxxxx"
  //     response_url: "~"
  //     channel_name: "~"
  //     token: "~"
  //     team_domain: "~"
  //     command: "~"
  //     channel_id: "Cxxxxxxxx"
  //     text: ""
  //   }

  if (payload.token != slackToken()) {
    return mkErrorMsg("Verification failed.");
  }

  var uid = payload.user_id;
  var uname = payload.user_name;
  var args = payload.text;

  switch (payload.command) {
    case "/goal":
      return goalHandler(uid,uname,args);
    case "/score":
      return scoreHandler(uid,uname,args);
  }

  // shouldn't be possible to end up here...
  return mkGeneralMsg("Got POST on "+ new Date() + " for " + payload.command + ".");
}

function goalHandler(uid,uname,args) {
  // handler for /goal commands

  // possible variants:
  //
  //   /goal <-- return current goal (user only, not displayed in channel)
  //   /goal @user <-- return current goal for @user (user only, not in channel)
  //   /goal new goal <-- set current goal to 'new goal' (posts to channel/webhook)
  //   /goal @user new goal <-- set current goal for @user (shows in channel)? [NOT SUPPORTED]
  //
  //   /goal help
  //   /goal connect
  //
  // so, args should be a string like: "<@Uxxxxxxxx|name> Some new goal."

  args = parseArgs(args); // uid, uname, body (either an action or a new goal)

  if (args.body) {
    // check for supported actions...
    var action = [/help/,/connect/]; // regexp for supported actions

    var idx = action.reduce(function(prev,re,i) {
      if (re.test(args.body)) {
        return i;
      }
      return prev;
    },null);

    switch(idx) {
      case 0: // help
        // return help msg
        return mkHelpMsg();
      case 1: // connect
        // return connect msg/prompt?
        if (!getUser(uid)) {
          return mkConnectMsg();
        } else {
          return mkErrorMsg("You're already connected... try `/goal help` to get started.");
        }
    }
  }

  // check user is known to us...
  if (!getUser(uid)) {
    return mkUserErrorMsg();
  }

  // if we end up here, args.body is either empty or contains a new goal...

  if (args.body) {
    // setting goal

    if (args.uid && args.uid != uid) {
      return mkErrorMsg("You can't set goals for <@" + args.uid + ">.");
    }

    // set goal in Google sheet
    return setCurrentGoal(uid,args.body);
  } else {
    // querying goal

    if (args.uid) {
      uid = args.uid;
    }

    // get goal from Google sheet
    return getCurrentGoal(uid);
  }
}

function testGoalHandler() {
  // test goalHandler()
  var uid = "Uxxxxxxxx";
  var uname = "nobody";

  // usage: /goal help
  var args = "help";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  var result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result);

  // usage: /goal connect
  args = "connect";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result);

  // usage: /goal
  args = "";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result);

  // usage; /goal @uname
  args = "<@" + uid + "|" + uname + "> ";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result);

  // usage: /goal lorem ipsum
  args = "lorem ipsum";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result);

  // usage: /goal @uname lorem ipsum
  args = "<@" + uid + "|" + uname + "> lorem ipsum";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result);

  // test unknown user...
  uid = "UUnknownUser";
  uname = "noname";
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);

  result = goalHandler(uid,uname,args);

  Logger.log("- %s.",result);
}

function scoreHandler(uid,uname,args) {
  // handler for /score commands

  // possible variants:
  //
  //   /score <-- return current users score (user only, not in channel)
  //   /score @user <-- return the score for @user (user only, not in channel)
  //   /score @user score <-- set the score for @user (note: cannot set your own score) (shows in channel)
  //
  //   /score help

  return mkGeneralMsg("Who's keeping score?");
}

function parseArgs(args) {
  // parse slash command arguments

  // args is likely a string like: "<@Uxxxxxxxx|name> Some new goal."

  //defaults
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

function getUser(uid) {
  // check that uid is known to us
  var ss = SpreadsheetApp.openById(sheetId());
  var s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Slack UID"],[uid])[0]; // first matching entry

  return (typeof(row) != "undefined"); // return true for know users
}

function testGetUser() {
  // test getUser()

  // known user
  uid = "Uxxxxxxxx";
  Logger.log("Testing getUser(%s)",uid);

  var result = getUser(uid);

  Logger.log("- %s.",result);

  // unknown user
  uid = "UUnknownUser";
  Logger.log("Testing getUser(%s)",uid);

  var result = getUser(uid);

  Logger.log("- %s.",result);
}

function addUser(uid,uname) { // OK
  // add a new user and return backend settings
  var ss = SpreadsheetApp.openById(sheetId());

  // 1. find candidate entry on the score sheet
  var s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Slack UID"],[uid])[0]; // first matching entry

  if (row != null) { // FIXME: row is actually 'undefined'
    // user exists...?
    return row;
  }

  // 2. user is unknown... but use some huristics here to see if we have any close matches
  Logger.log("User %s (%s) is unknown.",uid,uname);

  // loop over known writers and see if any "match" the supplied slack user name
  var col = getColumnByName(s,["Writer"]);

  var range = s.getDataRange();
  var nRows = range.getHeight();

  writerloop:
  for (row = 1; row <= nRows; row++) { // getHeight()
    var writer = range.getCell(row,col).getDisplayValue(); // col is the "Writer" column

    if (writer.length === 0) {
      // empty cell...
      continue
    }

    var re = new RegExp(".*"+writer+".*","i"); // case insensitive
    if (re.test(uname)) {
      // writer might be our new/unknown user...
      //
      // 1. check that this writers uid field is empty
      // 2. if so, appropriate the existing record by assigning the current uid to this writer,
      var uid_ = getRow(s,row,["Slack UID"])[0];

      Logger.log("User %s (%s) might be %s (uid:%s).",uid,uname,writer,uid_);

      if (uid_.length === 0) {
        Logger.log("Ok. Appropriating %s to be %s (%s).",writer,uid,uname);
        setRow(s,row,["Slack UID"],[uid]);
        break writerloop;
      }
    }
  }

  row = getRowByColumn(s,["Slack UID"],[uid])[0]; // first matching entry

  if (row == null) { // FIXME: row is 'undefined'
    // no entry found... create a new row
    s.insertRowAfter(nRows); // append row at the bottom (inherits formatting)

    row = nRows + 1;
    setRow(s,row,["Slack UID","Writer"],[uid,uname]);
  }

  // 3. find/create the users history sheet
  var h = ss.getSheetByName(uid);
  if (h == null) {
    // create the users history sheet...
//    var template = ss.getSheetByName('Template');
//    ss.insertSheet(uid, {template: template});
    ss.insertSheet(uid);
    h = ss.getSheetByName(uid);
    h.appendRow(["Date","Goal","Score"]); // column headings
  }

  // copy any existing goal to the history sheet
  h.insertRowAfter(h.getLastRow()); // append row at the bottom (inherits formatting)
  setRow(h,h.getLastRow()+1,["Date","Goal"],getRow(s,row,["Date","Goal"]));

  return row;
}

function testAddUser() {
  // test addUser()
  var ss = SpreadsheetApp.openById(sheetId());
  uid = "Uxxxxxxxx";
  uname = "nobody";

  Logger.log("Testing addUser(%s,%s,%s)",ss.getName(),uid,uname);

  var result = addUser(ss,uid,uname);

  Logger.log("- %s.",result);
}

function setCurrentGoal(uid,goal) {
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?

  var s = ss.getSheetByName("Sheet1"); // FIXME

  var row = getRowByColumn(s,["Slack UID"],[uid])[0];

  if (row == null) {
    return mkUserErrorMsg(); // shouldn't ever end up here!
  }

  setRow(s,row,["Date","Goal"],[new Date(),goal]);

  // update the history sheet
  var h = ss.getSheetByName(uid);
  h.insertRowAfter(h.getLastRow()); // append row at the bottom (inherits formatting)
  setRow(h,h.getLastRow()+1,["Date","Goal"],[new Date(),goal]);

  // post msg to webhook... in_channel - goes to everyone
  var url = webhookUrl();
  if (url) {
    var msg = Utilities.formatString("<@%s> set a new goal: %s",uid,goal);
    postToUrl(url,mkGeneralMsg(msg));
  }

  return mkGeneralMsg("Ok, got it!"); // ephemeral - goes to the user only
}

function testSetCurrentGoal() {
  // test setCurrentGoal()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");

  var row = getRowByColumn(s,["Writer"],["nobody"]);
  var uid = getRow(s,row,["Slack UID"]);

  var goal = "lorem ipsum";

  // known user
  Logger.log("Testing setCurrentGoal(%s,%s)",uid,goal);

  var result = setCurrentGoal(uid,goal);

  Logger.log("- %s",result);

  // unknown user
  uid = "UUnknownUser";
  Logger.log("Testing setCurrentGoal(%s,%s)",uid,goal);

  var result = setCurrentGoal(uid,goal);

  Logger.log("- %s",result);
}

function getCurrentGoal(uid) {
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?

  var s = ss.getSheetByName("Sheet1"); // FIXME

  var row = getRowByColumn(s,["Slack UID"],[uid])[0];

  if (row == null) {
    return mkGeneralMsg("I don't know <@" + uid + ">."); // uid isn't known to us...
  }

  var goal = getRow(s,row,["Goal","Date"]);

  var msg = "Goal for <@" + uid + ">: " + goal[0];

  if (goal[1]) {
    var days = Math.floor((new Date() - goal[1])/(24*60*60*1000)); // converts milliseconds to days
    msg = msg + " (set " + days + " days ago)";
  }

//  msg = msg + ".";

  return mkGeneralMsg(msg);
}

function testGetCurrentGoal() {
  // test getCurrentGoal()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");

  // known user
  var uid = "Uxxxxxxxx";
  Logger.log("Testing getCurrentGoal(%s)",uid);

  var result = getCurrentGoal(uid);

  Logger.log("- %s",result);

  // unknown user
  uid = "UUnknownUser";
  Logger.log("Testing getCurrentGoal(%s)",uid);

  result = getCurrentGoal(uid);

  Logger.log("- %s",result);
}
