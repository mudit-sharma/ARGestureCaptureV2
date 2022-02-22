if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const https = require('https');
const app = express();
const port = process.env.PORT || 8080;

//site variables
const appInfo = {
    title: '3D Hand Gestures Analysis', 
    description:'WEB API for detecting hand gestures',
};

const pageInfo = [
    {key: 'index', value: ''},
    {key: 'mediapipe', value: 'MediaPipe'},
    {key: 'contact', value: 'Contact Us'},
];

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
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
    console.log('Press Ctrl+C to quit.');
});