const port = process.argv[2];
const ejs = require('ejs');
const express = require('express');
const app = express();
const readline = require('readline');
const path = require('path');
const { MongoClient } = require('mongodb');


require('dotenv').config({ path: path.resolve(__dirname, 'secretTunnel/.env') });


const uri = process.env.MONGO_CONNECTION_STRING;
const dbName = 'CMSC335DB'; 
const collectionName = 'jokesGenerated';
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'templates'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

async function connectToDatabase() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        return client;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

cli.on('line', (input) => {
    const command = input.trim();
    if (command === 'stop') {
        console.log('Shutting down the server');
        process.exit(0);
    } else {
        console.log(`Invalid command: ${command}`);
    }
    cli.prompt();
});


app.listen(port, () => {
    console.log(`Web server started and running at http://localhost:${port}`);
    cli.setPrompt('Stop to shutdown the server: ');
    cli.prompt();
});
app.get('/', (req, res) => {
    res.render('home');
});
app.get('/apply', (req, res) => {
    res.render('application', { port });
});
app.post('/apply', async (req, res) => {
    const appData = {
        name: req.body.name,
        type: req.body.type,
        setup: req.body.setup, 
        punchline: req.body.punchline
    };

    const client = await connectToDatabase();
    try {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        await collection.insertOne(appData);
        res.render('joke', appData);
    } catch (error) {
        console.error('Application submission error:', error);
        res.status(500).send('Error processing application');
    } finally {
        await client.close();
    }
});
app.get('/reviewJokes', (req, res) => {
    res.render('findAJoke', { port });
});


app.post("/reviewJokes", async (req, res) => {
    const client = new MongoClient(uri);
    try {
        const name = req.body.name; 

        await client.connect();
        const allApps = await client.db(dbName)
            .collection(collectionName)
            .find({})
            .toArray();

     
        const results = allApps.filter(app => {
            return app.name === name;
        });
    

        let htmlTable = `<table border="1"><tr><th>Name</th><th>Type</th><th>SetUp</th><th>Punchline</th></tr>`;
        
        if (results.length > 0) {
            results.forEach(app => {
                htmlTable += `<tr><td>${app.name}</td><td>${app.type}</td><td>${app.setup}</td><td>${app.punchline}</td></tr>`;
            });
        } else {
            htmlTable += `<tr><td colspan="2">No applicants found with the name ${name}</td></tr>`;
        }
        
        htmlTable += "</table>";

        res.render("allJokes",{
            name: name,
            tableHTML:htmlTable
        });

    } catch (error) {
        console.error("Error:", error);
        res.render("allJokes", {
            tableHTML: `<p style="color:red">Error loading results: ${error.message}</p>`
        });
    } finally {
        await client.close();
    }
});
app.get('/randomJoke',(req,res)=>{
    res.render('randomJoke', { port });
})
app.post('/randomJoke',async(req,res)=>{
    let url = "https://official-joke-api.appspot.com/random_joke";
    const response = await fetch(url);
    const json = await response.json();
    res.render('joke',{
        type:json.type,
        setup:json.setup,
        punchline:json.punchline
    })
});