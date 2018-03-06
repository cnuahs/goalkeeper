# goalkeeper

A slack app backend to track self-assigned writing goals.

## Development

The goalkeeper is a web app for the Google [Apps Script](https://developers.google.com/apps-script/) platform. To set up your development environment:

1. Clone this repository:
```bash
  $ git clone https://github.com/cnuahs/goalkeeper.git ./goalkeeper.git && cd goalkeeper.git
```

2. Install clasp (https://github.com/google/clasp), the Google Command Line Apps Script Projects tool:
```bash
  $ sudo npm i @google/clasp -g
```
Note: this assumes you have Node and the Node Package Manager (npm) installed. If not, download and install Node for your platform from https://nodejs.org/.

3. Enable the Apps Script API on your Google account at https://script.google.com/home/usersettings.

4. Create a new Apps Script project at https://script.google.com/home.

5. Authenticate clasp with Google Apps Script
```bash
  $ clasp login
```

6. Create a new clasp project:
```bash
  $ clasp create docId
```
where `docId` is the Google Docs ID of the project created in Step 4.

7. Push the code to the Google Apps Script platform:
```bash
  $ clasp push
```
8. Modify the code as you see fit. To deploy your changes:
```bash
  $ clasp push
  $ clasp version "A short description."
  $ clasp deploy <n>
```
where n is the version number of the version you want to deploy, likely the one printed by clasp.

**Note:**

The file `config.js` is a template configuration file. You need to edit it's contents to provide your slack verification token etc. Don't commit it to git! To avoid doing so I have git 'ignore' changes to config.js as follows:
```bash
  $ git update-index --assume-unchanged config.js
```
if you later need/want to extent the template, you need to start tracking it again,
```
  $ git update-index --no-assume-unchanged config.js
```
You can then modify the template and `git add` and `git commit` it.

**Be careful not to commit your auth or verification tokens to git!**
