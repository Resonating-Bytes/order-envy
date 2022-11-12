EJS
===

<% code %> - doesn't render anything, used for control flow
<%- code %> - runs the code and renders the result
<%= variable %> - renders the value of 'variable'

RESTful routes:
Name        Route               HTTP Verb       Purpose                                                                             Mongoose Method
===================================================================================================================================================
index       /things             GET             List all `things`                                                                   Thing.find()
new         /things/new         GET             Show new `thing` form                                                               N/A
create      /things             POST            Create new `thing`, then redirect somewhere (typically back to `index`)             Thing.create()
show        /things/:id         GET             Show info about a specific `thing`                                                  Thing.findById()
edit        /things/:id/edit    GET             Show edit form for one `thing`                                                      Thing.findById()
update      /things/:id         PUT             Update a particular `thing`, then redirect somewhere (typically back to `index`)    Thing.findByIdAndUpdate()
destroy     /things/:id         DELETE          Delete a particular `thing`, then redirect somewhere (typically back to `index`)    Thing.findByIdAndRemove()

Heroku notes:
    Need to provide a `start` script in package.json
    Do NOT specify the IP to listen on for `app.listen( )`
    PORT should be `const PORT = process.env.PORT || 1979;`

    `heroku login` - connect heroku and git

    `heroku create` - create a new project space to push to
        Needs to be run from root git directory for the project

    `git push heroku master` - push up all changes from `master` to heroku
    `git subtree push --prefix subDirPath heroku master` - only push changes from `subDirPath` to heroku
        Have to use `/` style path seperators
        Has to be run from root git direcory for the project

    `heroku logs` - shows errors from deployed app
        Can add `--tail` to keep it open and running
        Can add `--source app` to see stdout and stderr output

    `heroku restart` - force restart the hosted version

    `heroku open` - shortcut to open the site from the command line

    `heroku apps:rename newname` - rename the app from the CLI

    `heroku ps:scale web=1` - ensure that at least one instance of the app is running

    `heroku config:set <KEY>=<VALUE>` - set env vars from command line for a project

    `heroku run <command>` - connects to remote instance and runs the command
        output is printed in local terminal

    See project status at:
        https://dashboard.heroku.com/apps

MongoDB Notes:
    run `mongod` to start the Mongo server locally
        requires `/data/db` and `/data/log`, or you can use `-dbpath <fullPath>` to point it somewhere else

    Commands:
        `use`: 
            select the DB to be active
            DB is created if it doesn't exist
        `show`: 
            lists various things
            Options: `dbs`, `collections`, ...
        `insert`: 
            push something into the DB
            syntax: db.<collectionName>.insert({key: "value"})
        `find`:
            find entries in the current DB
            syntax: db.<collectionName>.find({<optional>})
            leave empty to return everything in the collection
            pass in an object with fields filled out that you want to match
        `update`:
            db.<collectionName>.update({<objectPropertiesToMatch>}, {<newValuesToSet>})
            use {$set: {<specificProperties>}} to only change the specific properties
            otherwise properties not present in {<newValuesToSet>} will be removed
        `remove`:
            db.<collectionName>.remove({<objectPropertiesToMatch>})
            can add `, {justOne: true}` after the search object to limit how many are removed
        `drop`:
            db.<collectionName>.drop()
            delete all entries in the given collection
