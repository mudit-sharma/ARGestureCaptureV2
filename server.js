if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const bodyParser = require('body-parser');
const fs = require('fs');
const express = require('express');
const https = require('https');
const app = express();
const port = process.env.PORT || 8080;

var router = express.Router();
app.use(bodyParser.json())
app.use(express.static('public')); // static directory access to "public" directory (css, js, etc.).

app.use(bodyParser.text());
app.use(bodyParser.urlencoded({
  parameterLimit: 100000,
  limit: '50mb',
  extended: true
}));

//site variables
const appInfo = {
    title: '3D Hand Gestures Analysis', 
    description:'Web app for recording hand gestures',
};

app.post('/results/hands/', (req, res) => {
    try {
        saveFileLocally(
            buildFilesData(
                `results/hands/${req.body.dirName.toString().trim()}`, 
                req.body.data, 
                "hands")
        );
        res.status(200);
    } catch (error) {
        console.log(error);
    }
    res.end(); // end the response
})

app.post('/results/fullbody/', (req, res) => {
    console.log(req.body);
    console.log("Full Body Data received.");
    res.send('OK');
})

// Home page request/response
app.get('/', (req, res) => {
    res
    .status(200)
    .render(pageInfo[0].key, {
        info: appInfo,
        title: appInfo.title,
        description: appInfo.description,
        pHeader: "3D Hand Gestures Analysis",
        pDescription: "Web app for recording hand gestures"
    });
});

module.exports = router;

const pageInfo = [
    {key: 'index', value: ''},
    {key: 'mediapipe', value: 'MediaPipe'},
    {key: 'contact', value: 'Contact Us'},
];

app.post('/mediapipe', function(req, res) {
    try {
        saveFileLocally(
            buildFilesData(
                `results/mediapipe/${req.body.dirName.toString().trim()}`, 
                req.body.data, 
                "hands")
        );
        res.status(200);
    } catch (error) {
        console.log(error);
    }
    res.end(); // end the response
});

// Available Gesture types(actions).
const positionList = [
    "Select Range",
    "Select Lasso", 
    "Select Cluster", 
    "Select Single Point", 
    "Select Axis", 
    "Multi-Select", 
    "Zoom", 
    "Pan", 
    "Rotate", 
    "Filter", 
    "Highlight", 
    "Save View", 
    "Export Data"
];

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
    console.log('Press Ctrl+C to quit.');
});

// To convert json string to csv string.
function JSONToCSVString(jsonData, isMediaPipeData) {
    sampleData = "";
    sampleData += "TIME";
    for (let i = 0; i < 21; i ++) {
        sampleData += `,JOINT_${i}_X, JOINT_${i}_Y, JOINT_${i}_Z`;
    }
    sampleData += "\n";
    for (let i = 0; i < jsonData.length; i++) {
        sampleData += `${jsonData[i].time}`;
        // console.log(`i: ${i}`);
        for (let j = 0; j < jsonData[i].keypoints.length; j++) {
            if (jsonData[i].keypoints.length == 21)
                if (isMediaPipeData)
                    sampleData += `,${jsonData[i].keypoints[j].x}, ${jsonData[i].keypoints[j].y}, ${'z' in jsonData[i].keypoints[j] ? jsonData[i].keypoints[j].z : '0'}`;
                else if (jsonData[i].keypoints[j].length == 3)
                    sampleData += `,${jsonData[i].keypoints[j][0]}, ${jsonData[i].keypoints[j][1]}, ${jsonData[i].keypoints[j][2]}`;
        }
        sampleData += "\n";
    }
    return sampleData;
}

// build csv file data directory with given string as its content.
function buildFilesData(dirPath, responseData, apiName) {
    const operation = responseData.operation.toString().trim();
    const datetime = responseData.datetime.toString().trim();
    let fileData = []
    console.log(responseData.handdata);
    for (const [key, value] of Object.entries(responseData.handdata)) {
        const filePath = `${dirPath}#${operation}#${key}#${datetime}.csv`;
        const csvData = JSONToCSVString(value, apiName.toLowerCase().includes("hands"));
        fileData.push({path: filePath, api: apiName, data: csvData});
    }
    return fileData;
}

// create csv files locally with given csv data directories.
function saveFileLocally(fileData) {
    const dirPath = fileData[0].path.substring(0, fileData[0].path.lastIndexOf('/'));
    if(!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    fileData.forEach(fileInfo => {
        fs.writeFile(fileInfo.path, fileInfo.data, {
            flag: "w"
            }, function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("The new file was created on server pc: " + fileInfo.path);
            console.log(`Create#${fileInfo.path.substring(fileInfo.path.indexOf(fileInfo.api) + fileInfo.api.length)}`);
        });
    });
}