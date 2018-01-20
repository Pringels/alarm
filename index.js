const MPlayer = require('mplayer');
const express = require('express');
const schedule = require('node-schedule');
const fetch = require('node-fetch');
const env = require('node-env-file');
const bodyParser = require('body-parser');

env('.env');

/**
 * ### Globals
 */

let START_TIME = '0 7 * * *';
let STOP_TIME = '0 8 * * *';
let WEATHER;
let ALARM;

/**
 * ### Audio controller
 */
const player = new MPlayer();

// Fix for library
// See https://github.com/noodny/mplayer/issues/18
player.setOptions = function(options) {
    if (options && Object.keys(options).length) {
        Object.keys(options).forEach(
            function(key) {
                this.player.cmd('set_property', [key, options[key]]);
            }.bind(this)
        );
    }
};

player.setOptions({
    loop: 0
});

function startAlarm() {
    player.openFile('./mp3/forest.mp3');
    incrementVolume({
        start: 0,
        step: 1,
        target: player,
        interval: 8000
    });
}

function stopAlarm() {
    player.stop();
    player.volume(0);
}

function incrementVolume({ start, step, target, interval }) {
    let percentage = start + step;
    if (percentage < 100) {
        target.volume(percentage);
        setTimeout(
            () =>
                incrementVolume({
                    start: percentage,
                    step,
                    target,
                    interval
                }),
            interval
        );
    }
}

/**
 * ### Web server
 */
const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/start', function(req, res) {
    startAlarm();
    res.send('Alarm started');
});

app.get('/stop', function(req, res) {
    stopAlarm();
    res.send('Alarm started');
});

app.post('/setAlarm', function(req, res) {
    START_TIME = `${req.body.minute} ${req.body.hour} * * *`;
    STOP_TIME = `${req.body.minute} ${parseInt(req.body.hour) + 1} * * *`;
    setAlarm();
    res.send('Set alarm');
});

app.listen(3000, '0.0.0.0');

/**
 * ### Scheduler
 */
function setAlarm() {
    ALARM && ALARM.cancel();
    ALARM = schedule.scheduleJob(START_TIME, startAlarm);
    schedule.scheduleJob(STOP_TIME, stopAlarm);
    console.log('ALARM SET');
}

/**
 * Weather
 */
fetch(
    `http://api.openweathermap.org/data/2.5/weather?q=Berlin,de&appid=${
        process.env.OWM_API_KEY
    }`
)
    .then(function(res) {
        return res.json();
    })
    .then(function(body) {
        WEATHER = body.weather[0].main;
    });

/**
 * Init
 */

setAlarm();
