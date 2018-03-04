// GoalKeeper slash command handler for slack...

// POST payloads from slack slash commands contain the following parameter object:
//
//   payload.parameter = {
//     user_name: "~"
//     trigger_id: "~"
//     user_id: "Uxxxxxxxx"
//     team_id: "Txxxxxxxx"
//     response_url: "~"
//     channel_name: "~"
//     token: "~"
//     team_domain: "~"
//     command: "~"
//     channel_id: Cxxxxxxxx
//     text: ""
//   }

// 2018-03-04 - Shaun L. Cloherty <s.cloherty@ieee.org>

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
    case "/score":
      return scoreHandler(uid,uname,args);
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
  //   /goal help
  //   /goal connect
  //
  // so, args should be a string like: "<@U444CRH8S|shaunc> shaun's new goal"

  args = parseArgs(args); // uid, uname, body/goal
  if (args.uid) {
    uid = args.uid;
  }
  if (args.uname) {
    uname = args.uname;
  }

  Logger.log("goalHandler(): uid: " + uid + ", uname: " + uname);

  // check for user?
  
  var result = "uid: " + uid + ", uname: " + uname;
  if (args.body) {
    // setting goal

    // set goal in Google sheet
    setCurrentGoal(uid,uname,args.body); // adds the user if they don't exist

    result = result + ", goal: " + args.body;
  } else {
    // querying goal

    // get goal from Google sheet
    result = result + ", goal: " + getCurrentGoal(uid);
  }

  return ContentService.createTextOutput(result);
}

function testGoalHandler() {
  // test goalHandler()
  var uid = "Uxxxxxxxx";
  var uname = "nobody";  

  // usage: /goal
  var args = "";  
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);
  
  var result = goalHandler(uid,uname,args);
  
  Logger.log("- %s.",result.getContent());
  
  // usage; /goal @uname
  args = "<@" + uid + "|" + uname + "> ";  
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);
  
  result = goalHandler(uid,uname,args); 
  
  Logger.log("- %s.",result.getContent());
  
  // usage: /goal lorem ipsum
  args = "lorem ipsum";  
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);
  
  result = goalHandler(uid,uname,args); 
  
  Logger.log("- %s.",result.getContent());
  
  // usage: /goal @uname lorem ipsum
  args = "<@" + uid + "|" + uname + "> lorem ipsum";  
  Logger.log("Testing goalHandler(%s,%s,%s)",uid,uname,args);
  
  result = goalHandler(uid,uname,args); 
  
  Logger.log("- %s.",result.getContent());
  
  // now the supported actions:
  
  // usage: /goal help
  
  // usage: /goal connect
}

function scoreHandler(uid,uname,args) {
  // handler for /score commands

  // possible variants:
  //
  //   /score <-- return current users score (user only, not in channel)
  //   /score @user <-- return the score for @user (user only, not in nchannel)
  //   /score @user score <-- set the score for @user (note: cannot set your own score) (shows in channel)
  //
  //   /score help
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

function addUser(ss,uid,uname) { // OK
  // add a new user and return backend settings
  
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

function setCurrentGoal(uid,uname,goal) {
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?

  var s = ss.getSheetByName("Sheet1"); // FIXME
  
  var row = getRowByColumn(s,["Slack UID"],[uid])[0];
  
  if (row == null) {
    var row = addUser(ss,uid,uname);
  }
  
  setRow(s,row,["Goal"],[goal]);
  
  // update the history sheet
  var h = ss.getSheetByName(uid);
  h.insertRowAfter(h.getLastRow()); // append row at the bottom (inherits formatting)
  setRow(h,h.getLastRow()+1,["Date","Goal"],[new Date(),goal]);
}

function testSetCurrentGoal() {
  // test setCurrentGoal()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  
  var uname = "nobody";
  
  var row = getRowByColumn(s,["Writer"],[uname]);
  var uid = getRow(s,row,["Slack UID"]);
  
  var goal = "lorem ipsum";
  
  Logger.log("Testing setCurrentGoal(%s,%s,%s)",uid,uname,goal);
  
  var result = setCurrentGoal(uid,uname,goal);
  
  Logger.log("- %s",result);
}

function getCurrentGoal(uid) {  
  var ss = SpreadsheetApp.openById(sheetId());
  SpreadsheetApp.setActiveSpreadsheet(ss); // handy...?
  
  var s = ss.getSheetByName("Sheet1"); // FIXME

  var row = getRowByColumn(s,["Slack UID"],[uid]);
  
  if (row[0] != null) {
    return getRow(s,row[0],["Goal"])[0];
  }
}

function testGetCurrentGoal() {
  // test getCurrentGoal()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  
  var row = getRowByColumn(s,["Writer"],["Shaun"]);
  var uid = getRow(s,row,["Slack UID"]);
  
  Logger.log("Testing getCurrentGoal(%s)",uid);
  
  var result = getCurrentGoal(uid);
  
  Logger.log("- %s",result);
}

function getColumnByName(s,name) { // OK
  // find column(s) by name, returning column number(s)
  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

  // first nonempty row contains column headings...
  rowloop:
  for (var row = 1; row <= nRows; row++) {
    for (var col = 1; col <= nCols; col++) {
      var value = range.getCell(row,col).getDisplayValue();
      if (value) {
        // first non-empty cell
        var headings = s.getRange(row,col,1,nCols-col+1).getValues()[0];

        name = name.map(function(n) {
          if (typeof(n) == "RegExp") {
            return n;
          } else {
            return new RegExp(n,"i");
          }
        });

        // look for our column heading... colName
        var idx = name.map(function(re) {
          for (var i = 0; i < headings.length; i++) {
            if (re.test(headings[i])) {
              return i + col;
            }
          }
        });

        break rowloop;
      }
    } // col
  } // row
  
  return idx
}

function testGetColumnByName() {
  // test getColumnByName()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  name = ["Writer"];
  
  Logger.log("Testing getColumnByName(%s,%s)",s.getName(),name);
  
  var result = getColumnByName(s,name);
  
  Logger.log("- %s",result);
}

function getRowByColumn(s,name,value) { // OK
  // find row by contents of column name, returning row number
  var range = s.getDataRange();

  var nRows = range.getHeight();
  var nCols = range.getWidth();

  var col = getColumnByName(s,name)[0]; // column index

  if (col == null) {
    return null; // column not found?
  }

  var idx = new Array();
  for (var row = 1; row <= nRows; row++) {
    var val = range.getCell(row,col).getValue();

    value.forEach(function(v) {
      if (v == val) {
        idx.push(row);
      }
    });
    
  }
    
  return idx;
}

function testGetRowByColumn() {
  // test getRowByColumn()
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  name = ["Writer"];
  value = ["Shaun"];
  
  Logger.log("Testing getRowByColumn(%s,%s,%s)",s.getName(),name,value);
  
  var result = getRowByColumn(s,name,value);
  
  Logger.log("- %s",result);
}


function setRow(s,row,name,value) { // SET name = value WHERE row; OK
  // set column name(s) to value(s) on row
  
//  var range = s.getDataRange();
  var range = s.getRange(1,1,row,s.getLastColumn()); // in case row is empty and therefore not included by getDataRange()
  
  var nRows = range.getHeight();
    
  var col = getColumnByName(s,name); // column indicies
  
  for (var i = 0; i < col.length; i++) {
    var cell = range.getCell(row,col[i]);
    cell.setValue(value[i]);
  }  
}

function testSetRow() {
  // test setRow()  
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  row = getRowByColumn(s,["Writer"],["Shaun"]);
  name = ["Goal"];
  value = ["A new goal for Shaun."];
    
  Logger.log("Testing setRow(%s,%s,%s,%s)",s.getName(),row,name,value);
  
  var result = setRow(s,row,name,value);
  
  Logger.log("- %s",result);
}

function getRow(s,row,name) { // SELECT name WHERE row; OK
  // get value(s) from column name(s) on row
    
  var range = s.getDataRange();
  
  var value = getColumnByName(s,name).map(function (col) {
    return range.getCell(row,col).getValue();
  });
    
  return value;
}

function testGetRow() {
  // test getRow()  
  var ss = SpreadsheetApp.openById(sheetId());
  s = ss.getSheetByName("Sheet1");
  row = getRowByColumn(s,["Writer"],["Shaun"]);
  name = ["Writer","Goal"];
  
  Logger.log("Testing getRow(%s,%s,%s)",s.getName(),row,name);
  
  var result = getRow(s,row,name);
  
  Logger.log("- %s",result);
}

function mkErrorAttachment(msg) {
  return ({
    color: "danger",
    text: "*Error*:\n" + msg,
    mrkdwn_in: ["text"]
  })
}
