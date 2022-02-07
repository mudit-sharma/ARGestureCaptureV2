//import * as THREE from 'three';
//import { MeshLine, MeshLineMaterial, MeshLineRaycast } from './THREE.MeshLine';
'use strict'

var container = document.getElementById( 'dataOverlay' );
var visualisationName = $(container).attr('class');

// Global constants
var plotRange = 15;
var scaleMax = 1;
var scaleMin = 0.5;
var frustumSize = 1000;
var axisThickness = 10;
var axisColors = [0x00ff00, 0x0000ff, 0xff0000] // x, y ,z
var axisConeRadius = .3
var axisConeHeight = 1.2

// Global variables
let scaleSpeed = .005;
let panSpeed = 0.1;
let rotateSpeed = 0.03;

// Scene and camera initialisation
var scene = new THREE.Scene();
var dataCamera = new THREE.PerspectiveCamera( 55, $(container).width() / $(container).height(), .1, 1000 );
dataCamera.position.set( 0, 2, 28 );
//dataCamera.useOcclusionCulling = false;
var resolution = new THREE.Vector2( $(container).width(), $(container).height() );

// Renderer initialisation
var renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true, transparent: true });
renderer.setSize($(container).width(), $(container).height());
renderer.setPixelRatio( window.devicePixelRatio );
container.appendChild( renderer.domElement );
container.style.pointerEvents = "none"; // Disable mouse control - Enable for debugging only

// Camera orbit and mouse control
var controls = new THREE.OrbitControls( dataCamera, renderer.domElement );

// Global geometry groups
var axesGroup;
var textBoxPivot;
const modelPivot = new THREE.Group();
const dataPivot = new THREE.Group();
const dataGeometries = new THREE.Group();
var progressBar;
const progressBarGeometry = new THREE.Group();
var lassoLines;
const boxPivot = new THREE.Group();

// Animation geometries
var selectionBox;
const pointsGroup = new THREE.Group();
const selectedPointsGroup = new THREE.Group();

// Animation global vars
const selectionHighlightDuration = 200;
const deselectedDuration = 200;
const selectionBoxHoldDuration = 100;
const transformHoldDuration = 200;
const maxShiftedDistance = 4;
const maxRotateDistance = 1.5;
const delayBetweenPoints = 200;
const lineDrawInterval = 70;

var transformSpeed;
var isTransformPhase1 = true;
var isTransformPhase2 = false;

var globalFramesCount = 0;
var lassoAnimationFramesCount = 0;
var lassoLastLineDrawnFrame = 0;
var lassoPointsSelectedFrame = 0;
var selectionBoxHoldFrames = 0;
var selectionHighlightFrames = 0;
var transformHoldFrames = 0;
var deselectedFrames = 0;

var shiftedDistance = 0;
var rotateDistance = 0;
var lassoLinesDrawn = 0;
var pointsSelected = 0;

addLights(); // Add lighting to scene
init();

/**
 * Function to draw a line between the points given with assigned color and thickness.
 * @param {List} points A list of floats which every 3 floats being a point in space.
 * @param {HexNumber} color Hex value for color for the line.
 * @param {Float} thickness Thickness for the line.
 * @returns The Mesh() object of the line drawn.
 */
function drawLine(points, color=0xffffff, thickness=10) {
    const line = new MeshLine();
    line.setPoints(points);

    var material = new MeshLineMaterial( {
		useMap: false,
		color: new THREE.Color( color ),
		opacity: 1,
		resolution: resolution,
		sizeAttenuation: false,
		lineWidth: thickness,
    });
    
    const lineMesh = new THREE.Mesh(line, material);

    return lineMesh;
}

function drawBox(startPoint, endPoint, color, alpha) {
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    material.transparent = true;
    material.opacity = 0.5;
    const cube = new THREE.Mesh( geometry, material );
    cube.position.x = 0.5;
    cube.position.y = 0.5;
    cube.position.z = 0.5;

    boxPivot.add(cube);

    boxPivot.position.z = 5;
    boxPivot.scale.z = 0;
    boxPivot.scale.x = 15;
    boxPivot.scale.y = 0.1;
    dataGeometries.add( boxPivot );

    return boxPivot;
}

function drawTextBox(startPoint=[0,0,0], width=1, height=1, mat) {
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = mat;
    const cube = new THREE.Mesh( geometry, material );
    cube.position.x = 0.5;
    cube.position.y = 0.5;
    cube.position.z = 0.5;

    boxPivot.add(cube);

    boxPivot.position.x = startPoint[0];
    boxPivot.position.y = startPoint[1];
    boxPivot.position.z = startPoint[2];
    boxPivot.scale.z = width;
    boxPivot.scale.x = 0.1;
    boxPivot.scale.y = height;
    dataGeometries.add( boxPivot );

    return boxPivot;
}

function drawProgressBar() {
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( {color: 0x00b3f4} );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.x = 0;
    cube.position.y = 0;
    cube.position.z = 0;

    boxPivot.add(cube);

    boxPivot.position.x = -19;
    boxPivot.position.y = -15;
    boxPivot.position.z = 0;
    boxPivot.scale.z = 0.1;
    boxPivot.scale.x = 1;
    boxPivot.scale.y = 1;
    progressBarGeometry.add( boxPivot );

    return boxPivot;
}

/**
 * Plots a point (with a Sphere geometry) in space using given coordinates.
 * @param {Float} x Default is 0.
 * @param {Float} y Default is 0.
 * @param {Float} z Default is 0.
 * @param {Float} radius Radius/size for the point mesh. Default is 0.3.
 * @param {HexNumber} color Hex value for color for the point. Default is black.
 * @returns The Mesh() object of the point.
 */
function plotPoint(x=0, y=0, z=0, radius = 0.3, color = 0x000000) {
    const geometry = new THREE.SphereGeometry( radius, 32, 32 );
    const material = new THREE.MeshBasicMaterial( {color: color} );
    const sphere = new THREE.Mesh( geometry, material );
    sphere.position.x = x;
    sphere.position.y = y;
    sphere.position.z = z;
    dataGeometries.add( sphere );

    return sphere
}

/**
 * Add a preset of lights to the scene. Including a main directional light and an ambient light.
 */
function addLights() {
    scene.add( new THREE.AmbientLight( 0xffffff, 0.65 ) );

    const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light.position.set( 1, 1, 1 );
    light.castShadow = true;
    light.shadow.radius = 8;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    const d = 10;

    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;
    light.shadow.camera.far = 1000;

    scene.add( light );

}

/**
 * 
 * Plots a point (with a Sphere geometry) in space using given coordinates with an outline.
 * @param {Float} x Default is 0.
 * @param {Float} y Default is 0.
 * @param {Float} z Default is 0.
 * @param {Float} radius Radius/size for the point mesh. Default is 0.3.
 * @param {HexNumber} color Hex value for color for the point. Default is white.
 * @param {HexNumber} outlineColor Hex value for color for the outline of the point. Default is black.
 * @returns The Group() object of the point and its outline.
 */
function plotOutlinedPoint(x=0, y=0, z=0, radius = 0.3, color = 0xffffff, outlineColor = 0x000000) {
    const outlinedPoint = new THREE.Group();

    const geometry = new THREE.SphereGeometry( radius, 32, 32 );
    const material = new THREE.MeshStandardMaterial( {color: color} );
    const sphere = new THREE.Mesh( geometry, material );
    sphere.position.x = x;
    sphere.position.y = y;
    sphere.position.z = z;

    outlinedPoint.add( sphere );

    //Create outline object
    var outlineGeometry = new THREE.SphereGeometry( radius, 32, 32 );
    //Notice the second parameter of the material
    var outlineMaterial = new THREE.MeshBasicMaterial({color : outlineColor, side: THREE.BackSide});
    var outline = new THREE.Mesh(outlineGeometry, outlineMaterial);

    outline.position.x = x;
    outline.position.y = y;
    outline.position.z = z;

    //Scale the object up to have an outline (as discussed in previous answer)
    outline.scale.multiplyScalar(1.2);
    outlinedPoint.add(outline);

    outlinedPoint.renderOrder = 999;
    outlinedPoint.onBeforeRender = function(renderer) {
        renderer.clearDepth();
    };
    
    dataGeometries.add( outlinedPoint );

    return outlinedPoint
}

/**
 * Draws the Cartesian R3 axes.
 * @param {Float} axisLength Length of the axis. Default is the range of the plot.
 * @param {Boolean} axisArrow Enable axis arrowheads. Default is false.
 * @returns {THREE.Group} The THREE.Group() geometry group containing the axes.
 */
function drawCartesianAxes(axisLength = plotRange, axisArrow = false) {
    let xAxisPoints = [axisLength,0,0,0,0,0];
    let xAxis = drawLine(xAxisPoints,axisColors[0],axisThickness);

    let yAxisPoints = [0,axisLength,0,0,0,0];
    let yAxis = drawLine(yAxisPoints,axisColors[1],axisThickness);

    let zAxisPoints = [0,0,axisLength,0,0,0];
    let zAxis = drawLine(zAxisPoints,axisColors[2],axisThickness);

    axesGroup = new THREE.Group();
    axesGroup.add(xAxis);
    axesGroup.add(yAxis);
    axesGroup.add(zAxis);

    if (axisArrow) {
        const xAxisArrowGeometry = new THREE.ConeGeometry( axisConeRadius, axisConeHeight, 16 );
        const xAxisArrowMaterial = new THREE.MeshBasicMaterial( {color: axisColors[0]} );
        const xAxisArrowMesh = new THREE.Mesh( xAxisArrowGeometry, xAxisArrowMaterial );
        xAxisArrowMesh.position.set(axisLength,0,0);
        xAxisArrowMesh.rotation.z = -Math.PI/2;

        const yAxisArrowGeometry = new THREE.ConeGeometry( axisConeRadius, axisConeHeight, 16 );
        const yAxisArrowMaterial = new THREE.MeshBasicMaterial( {color: axisColors[1]} );
        const yAxisArrowMesh = new THREE.Mesh( yAxisArrowGeometry, yAxisArrowMaterial );
        yAxisArrowMesh.position.set(0,axisLength,0);

        const zAxisArrowGeometry = new THREE.ConeGeometry( axisConeRadius, axisConeHeight, 16 );
        const zAxisArrowMaterial = new THREE.MeshBasicMaterial( {color: axisColors[2]} );
        const zAxisArrowMesh = new THREE.Mesh( zAxisArrowGeometry, zAxisArrowMaterial );
        zAxisArrowMesh.position.set(0,0,axisLength);
        zAxisArrowMesh.rotation.x = Math.PI/2;

        axesGroup.add(xAxisArrowMesh);
        axesGroup.add(yAxisArrowMesh);
        axesGroup.add(zAxisArrowMesh);
    }

    scene.add(axesGroup);
    return axesGroup;
}

/**
 * Generates and renders random points within the range given.
 * If color is not set: Each point will have its color's RGB value based on its x,y,z coordinates.
 * @param {Number} count Number of points to draw. Default is 10.
 * @param {Float} min Lower bound of x,y coordinates for the points. Default is 0.
 * @param {Float} max Upper bound of x,y coordinates for the points. Default is plotRange.
 * @param {HexNumber} color Color for the points. If null: Points colored based on its coordinates. Default is null.
 * @param {Float} size Size of the point. Default is 0.2.
 * @returns {THREE.Group} The THREE.Group() geometry group containing the points.
 */
function drawRandomPoints(count=10,min=0,max=plotRange,color=null,size=0.2,outlined=false) {
    let randomColor = false;
    if (color === null) {
        randomColor = true;
    }
    var randomPointsGroup = new THREE.Group();
    for (let i = 0; i < count; i ++) {
        var randomX = Math.random() * (max - min) + min;
        var randomY = Math.random() * (max - min) + min;
        var randomZ = Math.random() * (max - min) + min;
        console.log(randomX,randomY,randomZ);
        if (randomColor) {
            var greenValue = parseInt((randomX / max) * 255);
            var blueValue = parseInt((randomY / max) * 255);
            var redValue = parseInt((randomZ / max) * 255);
            color = "#" + ((1 << 24) + (redValue << 16) + (greenValue << 8) + blueValue).toString(16).slice(1);
        }
        if (outlined) {
            var newPoint = plotOutlinedPoint(randomX, randomY, randomZ, size, color);
        } else {
            var newPoint = plotPoint(randomX, randomY, randomZ, size, color);
        }
        
        randomPointsGroup.add(newPoint);
    }

    dataGeometries.add(randomPointsGroup);
    return randomPointsGroup;
}

function changeOutlinePointColor(point, newColor = 0xffffff) {
    const mainPoint = point.children[0];
    mainPoint.material.color.setHex(newColor);
}

function disableOutlinePointColor(point, alpha = 0.3) {
    const mainPoint = point.children[0];
    const outline = point.children[1];
    mainPoint.material.transparent = true;
    mainPoint.material.opacity = alpha;

    outline.visible = false;
}

function enableOutlinePointColor(point) {
    const mainPoint = point.children[0];
    const outline = point.children[1];
    mainPoint.material.transparent = false;
    mainPoint.material.opacity = 1;

    outline.visible = true;
}

function animateSelectRange() {
    requestAnimationFrame( animateSelectRange );
    
    globalFramesCount++;
    if (selectionBox.scale.z == 0 && selectionHighlightFrames == 0) {
        // Start animation
        boxPivot.scale.z = 0.1;
        boxPivot.scale.x = 15;
        boxPivot.scale.y = 0.1;
    } else if (selectionBox.scale.z < 9 && selectionHighlightFrames == 0) {
        selectionBox.scale.z += 0.1;
    } else {
        if (selectionBoxHoldFrames < selectionBoxHoldDuration) {
            selectionBoxHoldFrames++;
        } else {
            if (selectionHighlightFrames == 0) {
                // Change color of points, 
                for (let i = 0; i < selectedPointsGroup.children.length; i++) {
                    changeOutlinePointColor(selectedPointsGroup.children[i], 0xffff00);
                }
                // Remove box
                selectionBox.scale.x = 0;
                selectionBox.scale.y = 0;
                selectionBox.scale.z = 0;
                selectionHighlightFrames++;
            } else if (selectionHighlightFrames < selectionHighlightDuration) {
                // Do nothing
                selectionHighlightFrames++;
            } else {
                // Reset animation: Change color back to white     
                for (let i = 0; i < selectedPointsGroup.children.length; i++) {
                    changeOutlinePointColor(selectedPointsGroup.children[i], 0xffffff);
                }

                selectionHighlightFrames = 0;
                selectionBoxHoldFrames = 0;
                selectionHighlightFrames = 0;
                globalFramesCount = 0;
            }
        }
       
    }
    
    controls.update();

	renderer.render( scene, dataCamera );
}

function selectRange() {
    selectionBox = drawBox();
    axesGroup = drawCartesianAxes(plotRange,true);

    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 8, 1, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 10, 2, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(0, 13, 3, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));

    // Select range [5,14]
    selectedPointsGroup.add(plotOutlinedPoint(15, 11, 5, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(4, 4, 5, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(12, 4, 7, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(6, 14, 9, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(13, 5, 9, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(12, 3, 10, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(2, 4, 11, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(15, 8, 11, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(5, 8, 13, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    animateSelectRange();
}

function animateSelectSinglePoint() {
    requestAnimationFrame( animateSelectSinglePoint );
    
    globalFramesCount++;
    if (deselectedFrames < deselectedDuration && selectionHighlightFrames == 0) {
        // Do nothing
        deselectedFrames++;
        progressBar.scale.x += 80.0/401;
    } else if (selectionHighlightFrames == 0) {
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffff00);
        }
        selectionHighlightFrames++;
        progressBar.scale.x += 80.0/401;
    } else if (selectionHighlightFrames < selectionHighlightDuration) {
        // Do nothing
        selectionHighlightFrames++;
        progressBar.scale.x += 80.0/401;
    } else {
        // Reset animation: Change color back to white     
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffffff);
        }

        console.log(globalFramesCount);
        console.log(progressBar.scale.x);
        selectionHighlightFrames = 0;
        deselectedFrames = 0;
        globalFramesCount = 0;
        progressBar.scale.x = 0.1;
    }    
    controls.update();

	renderer.render( scene, dataCamera );
}

function selectSinglePoint() {
    axesGroup = drawCartesianAxes(plotRange,true);
    progressBar = drawProgressBar();
    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));

    // Select a point
    selectedPointsGroup.add(plotOutlinedPoint(0, 7, 10, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);
    scene.add(progressBarGeometry);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
        
    animateSelectSinglePoint();
}

function animateSelectCluster() {
    requestAnimationFrame( animateSelectCluster );
    
    globalFramesCount++;
    if (deselectedFrames < deselectedDuration && selectionHighlightFrames == 0) {
        // Do nothing
        deselectedFrames++;
    } else if (selectionHighlightFrames == 0) {
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffff00);
        }
        selectionHighlightFrames++;
    } else if (selectionHighlightFrames < selectionHighlightDuration) {
        // Do nothing
        selectionHighlightFrames++;
    } else {
        // Reset animation: Change color back to white     
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffffff);
        }

        selectionHighlightFrames = 0;
        deselectedFrames = 0;
        globalFramesCount = 0;
    }    
    controls.update();

	renderer.render( scene, dataCamera );
}

function selectCluster() {
    axesGroup = drawCartesianAxes(plotRange,true);

    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(4, 4, 3, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 4, 2, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 3, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 4, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(6, 5, 3, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(2, 5, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 5, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 2, 3, 0.3, 0xffffff));

    // Select a cluster
    selectedPointsGroup.add(plotOutlinedPoint(3, 7, 10, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(4, 7, 11, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(4, 6, 9, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(3, 8, 10, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(5, 6, 11, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(6, 6, 9, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(4, 5, 9, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(7, 7, 10, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(3, 13, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 12, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(6, 14, 12, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 14, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 13, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(5, 12, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(6, 11, 13, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    animateSelectCluster();
}

function animateZoom() {
    requestAnimationFrame( animateZoom );
    
    globalFramesCount++;
    
    if (transformHoldFrames < transformHoldDuration) {
        // Do nothing
        transformHoldFrames++;
    } else {
        if (isTransformPhase1) {
            transformSpeed = -scaleSpeed;
            if (dataPivot.scale.x > scaleMin) {
                scaleData(transformSpeed);
            } else {
                isTransformPhase1 = false;
                isTransformPhase2 = !isTransformPhase1;
                transformHoldFrames = 0;
            }
        } else if (isTransformPhase2) {
            transformSpeed = scaleSpeed;
            if (dataPivot.scale.x < scaleMax) {
                scaleData(transformSpeed);
            } else {
                isTransformPhase2 = false;
                isTransformPhase1 = !isTransformPhase2;
                transformHoldFrames = 0;
            }
        }
    }

    controls.update();

	renderer.render( scene, dataCamera );
}

function zoom() {
    axesGroup = drawCartesianAxes(plotRange,true);

    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 8, 1, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 10, 2, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(0, 13, 3, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));

    // Select range [5,14]
    pointsGroup.add(plotOutlinedPoint(15, 11, 5, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 4, 5, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 4, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(6, 14, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 5, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 3, 10, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(2, 4, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(15, 8, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(5, 8, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    transformSpeed = scaleSpeed;
    animateZoom();
}

function animatePan() {
    requestAnimationFrame( animatePan );
    
    globalFramesCount++;
    
    if (transformHoldFrames < transformHoldDuration) {
        // Do nothing
        transformHoldFrames++;
    } else {
        if (isTransformPhase1) {
            transformSpeed = -panSpeed;
            if (shiftedDistance < maxShiftedDistance) {
                dataPivot.position.x += transformSpeed;
                shiftedDistance += panSpeed;
            } else {
                isTransformPhase1 = false;
                isTransformPhase2 = !isTransformPhase1;
                transformHoldFrames = 0;
                shiftedDistance = 0;
            }
        } else if (isTransformPhase2) {
            transformSpeed = panSpeed;
            if (shiftedDistance < maxShiftedDistance) {
                dataPivot.position.x += transformSpeed;
                shiftedDistance += panSpeed;
            } else {
                isTransformPhase2 = false;
                isTransformPhase1 = !isTransformPhase2;
                transformHoldFrames = 0;
                shiftedDistance = 0;
            }
        }
    }

    controls.update();

	renderer.render( scene, dataCamera );
}

function pan() {
    axesGroup = drawCartesianAxes(plotRange,true);

    // Sorted in Z direction

    pointsGroup.add(plotOutlinedPoint(15, 11, 5, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 4, 5, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 4, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(6, 14, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 5, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 3, 10, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(2, 4, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(15, 8, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(5, 8, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    transformSpeed = scaleSpeed;
    animatePan();
}

function animateRotate() {
    requestAnimationFrame( animateRotate );
    
    globalFramesCount++;
    
    if (transformHoldFrames < transformHoldDuration) {
        // Do nothing
        transformHoldFrames++;
    } else {
        if (isTransformPhase1) {
            transformSpeed = -rotateSpeed;
            if (rotateDistance < maxRotateDistance) {
                rotateData(transformSpeed);
                rotateDistance += rotateSpeed;
            } else {
                isTransformPhase1 = false;
                isTransformPhase2 = !isTransformPhase1;
                transformHoldFrames = 0;
                rotateDistance = 0;
            }
        } else if (isTransformPhase2) {
            transformSpeed = rotateSpeed;
            if (rotateDistance < maxRotateDistance) {
                rotateData(transformSpeed);
                rotateDistance += rotateSpeed;
            } else {
                isTransformPhase2 = false;
                isTransformPhase1 = !isTransformPhase2;
                transformHoldFrames = 0;
                rotateDistance = 0;
            }
        }
    }

    controls.update();

	renderer.render( scene, dataCamera );
}

function rotate() {
    axesGroup = drawCartesianAxes(plotRange,true);

    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 8, 1, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 10, 2, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(0, 13, 3, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(15, 11, 5, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 4, 5, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 4, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(6, 14, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 5, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 3, 10, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(2, 4, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(15, 8, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(5, 8, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    transformSpeed = scaleSpeed;
    animateRotate();
}

function animateSelectMultiple() {
    requestAnimationFrame( animateSelectMultiple );
    
    globalFramesCount++;

    if (pointsSelected === selectedPointsGroup.children.length) {
        // Reset animation: Change color back to white     
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffffff);
        }
        pointsSelected = 0;
        selectionHighlightFrames = 0;
    } else {
        if (selectionHighlightFrames == 0) {
            changeOutlinePointColor(selectedPointsGroup.children[pointsSelected], 0xffff00);
            selectionHighlightFrames++;
            pointsSelected++;
        } else if (selectionHighlightFrames < delayBetweenPoints) {
            // Do nothing
            selectionHighlightFrames++;
        } else {
            selectionHighlightFrames = 0;
        }
    }
    controls.update();

	renderer.render( scene, dataCamera );
}

function selectMultiple() {
    axesGroup = drawCartesianAxes(plotRange,true);

    // Sorted in Z direction
    
    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));
        
    pointsGroup.add(plotOutlinedPoint(1.5, 3, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    
    // Select a point
    selectedPointsGroup.add(plotOutlinedPoint(0, 0, 0, 0.00001, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(3, 14, 0, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(0, 7, 10, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(4, 7, 11, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(3, 3, 14, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(0, 0, 0, 0.0001, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1.5, 3, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(4, 4, 14, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 3, 13, 0.3, 0xffffff));
    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    animateSelectMultiple();
}

function animateSelectAxis() {
    requestAnimationFrame( animateSelectAxis );
    
    globalFramesCount++;
    if (deselectedFrames < deselectedDuration && selectionHighlightFrames == 0) {
        // Do nothing
        deselectedFrames++;
    } else if (selectionHighlightFrames == 0) {        
        axesGroup.children[1].material.color.setHex(0xffff00);
        axesGroup.children[4].material.color.setHex(0xffff00);
        axesGroup.children[6].material.opacity = 1;
        selectionHighlightFrames++;
    } else if (selectionHighlightFrames < selectionHighlightDuration) {
        // Do nothing
        selectionHighlightFrames++;
    } else {
        // Reset animation: Change color back to original     
        axesGroup.children[1].material.color.setHex(axisColors[1]);
        axesGroup.children[4].material.color.setHex(axisColors[1]);
        axesGroup.children[6].material.opacity = 0;

        selectionHighlightFrames = 0;
        deselectedFrames = 0;
        globalFramesCount = 0;
    }    
    controls.update();

	renderer.render( scene, dataCamera );
}

function selectAxis() {
    axesGroup = drawCartesianAxes(plotRange,true);
    
    const boxSize = 1;
    const boxLine = drawLine(
        [-boxSize,0.0,-boxSize,
        -boxSize,0.0,boxSize,
        boxSize,0.0,boxSize,
        boxSize,0.0,-boxSize,
        -boxSize,0.0,-boxSize,
        -boxSize,16.0,-boxSize,
        boxSize,16.0,-boxSize,
        boxSize,0.0,-boxSize,
        boxSize,16.0,-boxSize,
        boxSize,16.0,boxSize,
        boxSize,0.0,boxSize,
        boxSize,16.0,boxSize,
        -boxSize,16.0,boxSize,
        -boxSize,0.0,boxSize,
        -boxSize,16.0,boxSize,
        -boxSize,16.0,-boxSize]
        ,0xffffff,4);
        boxLine.rotation.y += 0.4;
    boxLine.material.transparent = true;
    boxLine.material.opacity = 0;
    axesGroup.add(boxLine);

    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));

    // Select a point
    selectedPointsGroup.add(plotOutlinedPoint(0, 7, 10, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);

    animateSelectAxis();
}

function animateFilterSelection() {
    requestAnimationFrame( animateFilterSelection );
    
    globalFramesCount++;
    if (selectionBox.scale.z == 0 && selectionHighlightFrames == 0) {
        // Start animation
        boxPivot.scale.z = 0.1;
        boxPivot.scale.x = 15;
        boxPivot.scale.y = 0.1;
    } else if (selectionBox.scale.z < 8 && selectionHighlightFrames == 0) {
        selectionBox.scale.z += 0.1;
    } else {
        if (selectionBoxHoldFrames < selectionBoxHoldDuration) {
            selectionBoxHoldFrames++;
        } else {
            if (selectionHighlightFrames == 0) {
                // Change color of points, 
                for (let i = 0; i < selectedPointsGroup.children.length; i++) {
                    disableOutlinePointColor(selectedPointsGroup.children[i]);
                }
                // Remove box
                selectionBox.scale.x = 0;
                selectionBox.scale.y = 0;
                selectionBox.scale.z = 0;
                selectionHighlightFrames++;
            } else if (selectionHighlightFrames < selectionHighlightDuration) {
                // Do nothing
                selectionHighlightFrames++;
            } else {
                // Reset animation: Change color back to white     
                for (let i = 0; i < selectedPointsGroup.children.length; i++) {
                    enableOutlinePointColor(selectedPointsGroup.children[i]);
                }

                selectionHighlightFrames = 0;
                selectionBoxHoldFrames = 0;
                selectionHighlightFrames = 0;
                globalFramesCount = 0;
            }
        }
       
    }
    
    controls.update();

	renderer.render( scene, dataCamera );
}

function filterSelection() {
    selectionBox = drawBox();
    selectionBox.position.z = 0;
    axesGroup = drawCartesianAxes(plotRange,true);

    // Sorted in Z direction
    selectedPointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(7, 8, 1, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(3, 10, 2, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(0, 13, 3, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(15, 11, 5, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(4, 4, 5, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));    
    selectedPointsGroup.add(plotOutlinedPoint(6, 14, 9, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(13, 5, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 3, 10, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(2, 4, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(15, 8, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(5, 8, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    animateFilterSelection();
}

function animateHighlightSelection() {
    requestAnimationFrame( animateHighlightSelection );
    
    globalFramesCount++;
    if (deselectedFrames < deselectedDuration && selectionHighlightFrames == 0) {
        // Do nothing
        deselectedFrames++;
    } else if (selectionHighlightFrames == 0) {
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffff00);
        }
        textBoxPivot.visible = true;
        selectionHighlightFrames++;
    } else if (selectionHighlightFrames < selectionHighlightDuration) {
        // Do nothing
        selectionHighlightFrames++;
    } else {
        // Reset animation: Change color back to white     
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffffff);
        }
        textBoxPivot.visible = false;

        selectionHighlightFrames = 0;
        deselectedFrames = 0;
        globalFramesCount = 0;
    }    
    controls.update();

	renderer.render( scene, dataCamera );
}

function highlightSelection() {
    var textCanvas = document.createElement("canvas");
    textCanvas.width = 200;
    textCanvas.height = 100;
    var ctx = textCanvas.getContext("2d");
    var texture = new THREE.CanvasTexture(textCanvas);
    var material = new THREE.MeshBasicMaterial( { map: texture } );

    ctx.textAlign = 'left';
    ctx.textBaseline = 'left';
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = "black";
    ctx.font = "24px sans-serif";
    ctx.fillText("Name: John Doe", 5, 24, 198);
    ctx.fillText("Postcode: 3168", 5, 48, 198);
    ctx.fillText("X: 7, Y: 10, Z:0", 5, 90, 198);
      
    axesGroup = drawCartesianAxes(plotRange,true);
    textBoxPivot = drawTextBox([0,7.5,10.5],6,3,material);
    textBoxPivot.visible = false;
    dataGeometries.add(textBoxPivot);

    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));

    // Select a point
    selectedPointsGroup.add(plotOutlinedPoint(0, 7, 10, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));

    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    
    animateHighlightSelection();
}

function animateLasso() {
    requestAnimationFrame( animateLasso );
    
    globalFramesCount++;

    if ((lassoAnimationFramesCount > 0 && lassoAnimationFramesCount < lineDrawInterval && lassoLinesDrawn === 0) || 
        (lassoLinesDrawn > 0 && lassoLinesDrawn < lassoLines.children.length && lassoAnimationFramesCount - lassoLastLineDrawnFrame > lineDrawInterval)) {
        lassoLines.children[lassoLinesDrawn].visible = true;
        lassoLinesDrawn++;
        lassoLastLineDrawnFrame = lassoAnimationFramesCount;
    } else if (lassoLinesDrawn === lassoLines.children.length && lassoAnimationFramesCount - lassoLastLineDrawnFrame > lineDrawInterval) {
        for (let i = 0; i < lassoLines.children.length; i++) {
            lassoLines.children[i].visible = false;
        }

        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffff00);
        }
        lassoPointsSelectedFrame = lassoAnimationFramesCount;
        lassoLinesDrawn = 0;
        lassoLastLineDrawnFrame = 0;        
    } else if (lassoPointsSelectedFrame > 0 && lassoAnimationFramesCount - lassoPointsSelectedFrame > selectionHighlightDuration) {
        for (let i = 0; i < selectedPointsGroup.children.length; i++) {
            changeOutlinePointColor(selectedPointsGroup.children[i], 0xffffff);
        }
        lassoAnimationFramesCount = 0;
        lassoPointsSelectedFrame = 0;
    }

    lassoAnimationFramesCount++;
    controls.update();

	renderer.render( scene, dataCamera );
}

function selectLasso() {
    axesGroup = drawCartesianAxes(plotRange,true);

    lassoLines = new THREE.Group();
    // Lasso segments: 0xffa500,8
    // 4,6,3,4,9,4
    // 4,9,4,4,7,12
    // 4,7,12,4,3,8
    // 4,3,8,4,3,4
    // 4,3,4,4,6,3
    lassoLines.add(drawLine([4,6,3,4,9,4],0xffa500,8));
    lassoLines.add(drawLine([4,9,4,4,7,12],0xffa500,8));
    lassoLines.add(drawLine([4,7,12,4,3,8],0xffa500,8));
    lassoLines.add(drawLine([4,3,8,4,3,4],0xffa500,8));
    lassoLines.add(drawLine([4,3,4,4,6,3],0xffa500,8));

    for (let i = 0; i < lassoLines.children.length; i++) {
        lassoLines.children[i].visible = false;
    }
    
    selectedPointsGroup.add(plotOutlinedPoint(4, 4, 5, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(3, 6, 6, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(1, 8, 6, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(12, 4, 7, 0.3, 0xffffff));
    selectedPointsGroup.add(plotOutlinedPoint(13, 5, 9, 0.3, 0xffffff));

    // Sorted in Z direction
    pointsGroup.add(plotOutlinedPoint(12, 14, 0, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 8, 1, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 10, 2, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(0, 13, 3, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(7, 10, 4, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(15, 11, 5, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(1, 12, 7, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(6, 14, 9, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(12, 3, 10, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(2, 4, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(15, 8, 11, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(5, 8, 13, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(13, 3, 14, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(11, 3, 15, 0.3, 0xffffff));
    pointsGroup.add(plotOutlinedPoint(3, 9, 15, 0.3, 0xffffff));

    dataGeometries.add(pointsGroup);
    dataGeometries.add(selectedPointsGroup);    
    dataGeometries.add(lassoLines);

    scene.add(modelPivot);
    scene.add(dataPivot);

    // Resets rotation pivot to center of the entire group instead of 0,0,0
    modelPivot.add(dataGeometries);
    dataPivot.add(dataGeometries);
    modelPivot.add(axesGroup);
    axesGroup.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    dataGeometries.position.set(-plotRange/2,-plotRange/2,-plotRange/2);
    
    rotateModel(1.3);
    animateLasso();
}

/**
 * Initialise the scene.
 * Draws the axes and data here.
 * IMPORTANT: Add the model and data into their Pivot groups for animation.
 */
function init() {
    switch (visualisationName) {
        case 'data-selectRange':
            selectRange();
            break;
        case 'data-selectSinglePoint':
            selectSinglePoint();
            break;
        case 'data-selectCluster':
            selectCluster();
            break;
        case 'data-zoom':
            zoom();
            break;
        case 'data-pan':
            pan();
            break;
        case 'data-rotate':
            rotate();
            break;
        case 'data-selectMultiple':
            selectMultiple();
            break;
        case 'data-selectAxis':
            selectAxis();
            break;
        case 'data-filterSelection':
            filterSelection();
            break;
        case 'data-highlightSelection':
            highlightSelection();
            break;
        case 'data-selectLasso':
            selectLasso();
            break;
    }
    console.log(visualisationName);
}

onWindowResize();

/**
 * Handles resizing window.
 * Not too important based on use cases.
 */
function onWindowResize() {

	var w = container.clientWidth;
	var h = container.clientHeight;

	var aspect = w / h;

	dataCamera.left   = - frustumSize * aspect / 2;
	dataCamera.right  =   frustumSize * aspect / 2;
	dataCamera.top    =   frustumSize / 2;
	dataCamera.bottom = - frustumSize / 2;

	dataCamera.updateProjectionMatrix();

	renderer.setSize( w, h );

	resolution.set( w, h );
}

/**
 * Animate: Rotates the model on the Y axis.
 * @param {Float} speed Rotation speed. Default is 0.2.
 */
function rotateModel(speed=.02) {
    modelPivot.rotation.y += speed;
    dataPivot.rotation.y += speed;
}

/**
 * Animate: Rotates the data only on the Y axis.
 * @param {Float} speed Rotation speed. Default is 0.2.
 */
function rotateData(speed=.02) {
    dataPivot.rotation.y += speed;
}

/**
 * Animate: Scales the data uniformly in all direction.
 * @param {Float} speed Scaling speed. Default is -0.01.
 */
function scaleData(speed=-.01) {
    dataPivot.scale.x += speed;
    dataPivot.scale.y += speed;
    dataPivot.scale.z += speed;
}

/**
 * Demonstration purpose: Scales the data up to a max size and then down to a minimum size and repeat.
 */
function scaleShowcase() {
    if (dataPivot.scale.x >= scaleMax || dataPivot.scale.x <= scaleMin) {
        scaleSpeed *= -1;
        scaleData(scaleSpeed);
    } else {
        scaleData(scaleSpeed);
    }
}

//window.addEventListener( 'resize', onWindowResize );
function animate() {

    requestAnimationFrame( animate );
    //rotateData();
    //rotateModel(.01);
    //scaleShowcase();
    controls.update();

	renderer.render( scene, dataCamera );

}