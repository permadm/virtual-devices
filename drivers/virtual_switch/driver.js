"use strict";

// a list of devices, with their 'id' as key
// it is generally advisable to keep a list of
// paired and active devices in your driver's memory.
var devices = {};

module.exports.init = function( devices_data, callback ) {
    console.log("Initializing driver");

    // when the driver starts, Homey rebooted. Initialise all previously paired devices.
    devices_data.forEach(function(device_data){
    	initDevice( device_data );
    })

    // let Homey know the driver is ready
    callback();
}

//the `added` method is called is when pairing is done and a device has been added
module.exports.added = function (device_data, callback) {
    console.log("Adding device " + device_data.id);

    initDevice(device_data);
    callback(null, true);
};

//the `delete` method is called when a device has been deleted by a user
module.exports.deleted = function (device_data, callback) {
    console.log("Deleting device " + device_data.id);
    delete devices[device_data.id];
    callback(null, true);
};

// the `pair` method is called when a user start pairing
module.exports.pair = function( other ) {
	other.on('list_devices', function( data, callback ){

        var device_data = {
            name: "New Virtual Switch",
            data: {
                id: "abcd1234"
            }
        }

        console.log("Added Virtual Switch: " + device_data.data.id);
        callback( null, [device_data] );

    })
};


//these are the methods that respond to get/set calls from Homey
//for example when a user pressed a button
module.exports.capabilities = {};
module.exports.capabilities.onoff = {};

// this function is called by Homey when it wants to GET the state, e.g. when the user loads the smartphone interface
// `device_data` is the object as saved during pairing
// `callback` should return the current value in the format callback( err, value )
module.exports.capabilities.onoff.get = function (device_data, callback) {
    console.log("get state");
	
    var virtualSwitch = getSwitch( device_data.id );
    if( virtualSwitch instanceof Error ) return callback( virtualSwitch );

    // send the state value to Homey
    callback( null, virtualSwitch.state.onoff );
};

// this function is called by Homey when it wants to SET the switches state, e.g. when the user presses the button on
// the smartphone
// `device_data` is the object as saved during pairing
// `onoff` is the new value
// `callback` should return the new value in the format callback( err, value )
module.exports.capabilities.onoff.set = function( device_data, onoff, callback ) {
    var virtualSwitch = getSwitch( device_data.id );
    if( virtualSwitch instanceof Error ) return callback( virtualSwitch );

    virtualSwitch.state.onoff = onoff;
    var state = virtualSwitch.state;
    var tokens = {"type": "device"};

    if (onoff) {
        console.log("Turning on");

        Homey.manager('flow').triggerDevice('virtual_switch_on', tokens, state, device_data, function (err, result) {
        	console.log("Device triggered callback");
       		if (err) return console.error(err);
    	});
    } else {
        console.log("Turning off");
    	
        Homey.manager('flow').triggerDevice('virtual_switch_off', tokens, state, device_data, function (err, result) {
        	console.log("Device triggered callback");
       		if (err) return console.error(err);
    	});
    }

    // also emit the new value to realtime
    // this produces Insights logs and triggers Flows
    // AWK: It does NOT trigger the flows, but don't see the harm to keep it here
    module.exports.realtime( device_data, 'onoff', onoff);
    
    // send the new onoff value to Homey
    callback( null, virtualSwitch.state.onoff );
};

//a helper method to get a switch from the devices list by it's id
function getSwitch( switch_id ) {
    var device = devices[ switch_id ];
    if( typeof device === 'undefined' ) {
        return new Error("Could not find Virtual Switch " + switch_id);
    } else {
        return device;
    }
}

//a helper method to add a switch to the devices list
function initDevice( device_data ) {
    devices[ device_data.id ] = {};
    devices[ device_data.id ].state = { onoff: false };
    devices[ device_data.id ].data = device_data;
}