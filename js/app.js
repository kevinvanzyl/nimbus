'use strict';

/* App Module */

var nimbus = angular.module('nimbus', ['auth0', 'angular-storage', 'angular-jwt',  'ngRoute','ngMap','whereappControllers', 'whereappServices', 'nimbusFilters', 'ngLoadingSpinner', "firebase"]);

nimbus.value('firebaseBase', "https://glaring-torch-8505.firebaseIO.com");
nimbus.value('console_debug', false);

nimbus.config(['$routeProvider', 'authProvider', '$httpProvider', '$locationProvider',
  'jwtInterceptorProvider', 
  function($routeProvider, authProvider, $httpProvider, $locationProvider,
  jwtInterceptorProvider) {

    $httpProvider.defaults.useXDomain = true;
    
  	authProvider.init({
		domain: 'glaring-torch-8505.auth0.com',
    	clientID: 'raHAbislnzmyQUBxhI5DCMin3gt8bCWd',
    	callbackURL: location.href,
		loginUrl: '/login'
  	});
  
	$routeProvider.
		when( '/', {
			redirectTo: '/contacts'
		}).
		when( '/login', {
			controller: 'LoginCtrl'
		}).
		when('/contacts', {
			templateUrl: 'partials/contact-list.html',
			controller: 'ContactListCtrl',
			requiresLogin: true
		}).
		when('/contacts/find', {
			templateUrl: 'partials/social-contacts.html',
			controller: 'SocialContactsCtrl', 
			requiresLogin: true
		}).
		when('/map', {
			templateUrl: 'partials/map.html',
			controller: 'MapCtrl',
			requiresLogin: true
		}).
		when('/map/:contactId', {
			templateUrl: 'partials/map.html',
			controller: 'MapCtrl',
			requiresLogin: true
		}).
		otherwise({
			redirectTo: '/login'
		});
		
	
	
  	jwtInterceptorProvider.tokenGetter = function(store) {
  	    return store.get('token');
	}
	// Add a simple interceptor that will fetch all requests and add the jwt token to its authorization header.
	// NOTE: in case you are calling APIs which expect a token signed with a different secret, you might
	// want to check the delegation-token example
	$httpProvider.interceptors.push('jwtInterceptor');
	
	
}])
.run(function($rootScope, auth, store, jwtHelper, $location, $http, ContactsService, LocationService, $firebaseArray, $firebaseObject, $interval, firebaseBase, console_debug) {

	$rootScope.logout = function() {
		auth.signout();
		store.remove('profile');
		store.remove('token');
		store.remove('location');
		store.remove('contacts');
		store.remove('googleContacts');
		store.remove('user_id');
		
		destroyLocationWatchers();
		
		$location.path('/login');
	}

	$rootScope.$on('$locationChangeStart', function() {
		window.scrollTo(0, 0);
		var token = store.get('token');
		
		if( token )
		{
		    if( !jwtHelper.isTokenExpired( token ) )
		    {
		        if( !auth.isAuthenticated )
		        {
		            auth.authenticate( store.get( 'profile' ), token ).then( function( data )
		            {
		                if (console_debug) console.log( 'authentication passed' );
		                setupScope();
		                $rootScope.$on('mapInitialized', $rootScope.initialiseContactsMarkers);

		            }, function( err )
		            {
		                if (console_debug) console.log( 'authentication failed' );
		            } );
		        }
		        else
		        {
		            if (console_debug) console.log('already authenticated');
		            setupScope();
		            $rootScope.$on('mapInitialized', $rootScope.initialiseContactsMarkers);
		        }
		    }
		    else
		    {
		        if (console_debug) console.log('Token has expired');
		        login();
		    }
		}
		else
		{
		    if (console_debug) console.log('Could not find token');
		    login();
		}
	});
	
	var login = function() {
		auth.signin({
			popup: false, 
			closable: false, 
			connection: "google-oauth2",
			authParams: {
				scope: 'openid name picture',
				connection_scopes: {
					'google-oauth2': ['https://www.google.com/m8/feeds/', 'https://www.googleapis.com/auth/plus.login']
				}
			}
		}, 
		function(profile, token) {
			store.set('profile', profile);
			store.set('token', token);
			$location.path('/');
		}, 
		function() {
			// Error callback
		});
	};
	
	var setupScope = function() {
		$rootScope.user_id = "";
		$rootScope.googleToken = "";
		$rootScope.profile_picture = "";
		$rootScope.contacts = {};

		if (auth.profile) {
			//get offline users icon
			$rootScope.profile_picture = auth.profile.picture;
			$rootScope.user_id = auth.profile.user_id;
			$rootScope.googleToken = auth.profile.identities[0].access_token;
			//phonegap check network connection here
			$rootScope.network = true;
			
			var store_user_id = store.get("user_id");
			//if user_id is not in the store
			if (!store_user_id || (store_user_id && store_user_id != auth.profile.user_id)) {
				if (store_user_id && store_user_id != auth.profile.user_id) {
					if (console_debug) console.log("store_user_id != auth.profile.user_id");
				}
				if ($rootScope.network) {
					var userFire = new Firebase(firebaseBase+"/users");
					userFire.once('value', function(dataSnapshot) {		
						if (dataSnapshot.child(auth.profile.user_id).val()) {
							if (console_debug) console.log("user exists in firebase: "+dataSnapshot.child(auth.profile.user_id).val());
							
							getOnlineContacts();
							setupGeolocation();
							setupOnlineLocation();
							destroyLocationWatchers();
							$interval(setupFirebaseLocationSharingWatcher, 2500, 1);
						}
						else {
							if (console_debug) console.log("no user exists in firebase: "+dataSnapshot.child(auth.profile.user_id).val());
							setupGeolocation();
							getOnlineContacts();
							//set up firebase structure for user
							setupFirebaseLocation();
							$interval(function() {
								if ($rootScope.contacts && Object.keys($rootScope.contacts).length > 0) {
									setupFirebaseSharing();
								}
								store.set("contacts", $rootScope.contacts);
								setupFirebaseUser();
								destroyLocationWatchers();
								$interval(setupFirebaseLocationSharingWatcher, 2500, 1);
							}, 2500, 1);
						}
					});
				}
			}
			//it is in the store and matches the authorised user
			else {
				if (console_debug) console.log("found user in store");
				
				setupGeolocation();
				setOfflineContacts();
				setupOfflineLocation();
				if ($rootScope.network) {
					getOnlineContacts();
					setupOnlineLocation();
					$interval(setupFirebaseLocationSharingWatcher, 2500, 1);
				}
			}
			store.set("user_id", auth.profile.user_id);
		} else {
			$location.path("/login");
		}
	};
	
	var setupGeolocation = function() {
		if (navigator.geolocation && !$rootScope.locationWatcher) {
			if (console_debug) console.log("Geolocation: setupGeolocation");
			$rootScope.locationWatcher = navigator.geolocation.watchPosition(showPosition, positionError, 
			{
				timeout: 5000,
				maximumAge: 10000,
				enableHighAccuracy: true
			});
		}
	}
	
	var showPosition = function(position) {
		if (console_debug) console.log("Geolocation: showPosition");
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		var pos = lat+","+lng;		
		
		var diff = 0;
		if (parseInt(position.timestamp) != "NaN" && parseInt($rootScope.timestamp) != "NaN") {
			diff = (position.timestamp - $rootScope.timestamp)/60000;
		}
		
		//if scope.position is null or
		
		//if position has changed and
			//$scope.accuracy is bigger than 20 metres and bigger than the new accuracy or
			//$scope.timestamp is more than 1 hour older than the new position or
			//the new accuracy is anything less than 20 (keep them moving)
			
		if ($rootScope.position == null ||
			(($rootScope.position != pos) && (
			($rootScope.accuracy > 20 && $rootScope.accuracy > position.coords.accuracy) || 
			(diff > 60.0) ||
			(position.coords.accuracy <= 20)))) {
			if (console_debug) console.log("Geolocation: location improved / changed");
			LocationService.postLocation(pos, position.timestamp, position.coords.accuracy);
			
			$rootScope.position = pos;
			$rootScope.accuracy = position.coords.accuracy;
			$rootScope.timestamp = position.timestamp;
			
			store.set('location', {
				position: $rootScope.position,
				accuracy: $rootScope.accuracy,
				timestamp: $rootScope.timestamp
			});
			
			if ($rootScope.map && $rootScope.map.markers[$rootScope.user_id] && (!store.get("following") || store.get("following") == $rootScope.user_id)) {
				var p = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
				$rootScope.map.setCenter(p);
				$rootScope.map.markers[$rootScope.user_id].setPosition(p);
			}
		}
	}
		
		
	function positionError(e) {
		switch (e.code) {
		case 0:
		    // UNKNOWN_ERROR
		    if (console_debug) console.log("Geolocation: The application has encountered an unknown error while trying to determine your current location. Details: " + e.message);
		    break;
		case 1:
		    // PERMISSION_DENIED
		    if (console_debug) console.log("Geolocation: You chose not to allow this application access to your location.");
		    break;
		case 2:
		    // POSITION_UNAVAILABLE
		    if (console_debug) console.log("Geolocation: The application was unable to determine your location.");
		    break;
		case 3:
		    // TIMEOUT
		    if (console_debug) console.log("Geolocation: The request to determine your location has timed out.");
		    break;
		}
	}
	
	var setupOnlineLocation = function() {
		if (console_debug) console.log("setupOnlineLocation");
		//fetch firebase location
		var user_id = auth.profile.user_id;
		var fire = new Firebase(firebaseBase+"/locations/"+user_id);

		fire.on("value", function(snapshot) {
		
			var data = snapshot.val();
			if (data) {
				$rootScope.position = data.latlng;
				$rootScope.timestamp = data.updated;
				$rootScope.accuracy = data.accuracy;
				
				store.set('location', {
					position: $rootScope.position,
					accuracy: $rootScope.accuracy,
					timestamp: $rootScope.timestamp
				});
				
				if (console_debug) console.log("Setting location from firebase: "+$rootScope.position);
			}
		
		}, function (errorObject) {
	  		//console.log("The read failed: " + errorObject.code);
		});	
	}
	
	var setupOfflineLocation = function() {
		if (console_debug) console.log("setupOfflineLocation");
		var location = store.get("location");
		
		if (location) {
			if (console_debug) console.log("Location found in store: "+location.latlng);
			$rootScope.position = location.latlng;
			$rootScope.timestamp = location.timestamp;
			$rootScope.accuracy = location.accuracy;
		}
	}
	
	var destroyLocationWatchers = function() {
		if ($rootScope.fireISW && $rootScope.fireISW.$ref()) {
			if (console_debug) console.log("destroying fireISW..");
			$rootScope.fireISW.$destroy();
			$rootScope.fireISW = null;
		}
		if ($rootScope.fireSWM && $rootScope.fireSWM.$ref()) {
			if (console_debug) console.log("destroying fireSWM..");
			$rootScope.fireSWM.$destroy();
			$rootScope.fireSWM = null;
		}
	}
	
	var getOnlineContacts = function() {
		if (console_debug) console.log("getOnlineContacts");
		//get online users contacts
		var contactsPromise = ContactsService.getContacts($rootScope.googleToken, $rootScope.user_id);
		contactsPromise.then(function (contacts) {
		
			var c = Object.keys(contacts);
			var buildObject = {};
			for (var i=0; i<c.length ; i++) {
				var cid = c[i];

				if (!$rootScope.contacts[cid]) {
					buildObject[cid] = {
						icon: contacts[cid].icon,
						name: contacts[cid].name,
						btnClass: "btn btn-primary form-control",
						sharing: 0,
						imsharingwith: 0,
						sharingwithme: 0,
						shareBtnText: "Share",
						shareStatus: "",
						shareBtnMethod: "share",
						id: cid
					};
				}
				else {
					buildObject[cid] = $rootScope.contacts[cid];
					buildObject[cid].icon = contacts[cid].icon;
					buildObject[cid].name = contacts[cid].name;
					buildObject[cid].id = cid;
				}
			}
			$rootScope.contacts = buildObject;
			store.set("contacts", $rootScope.contacts);
		}, function (error) {
			if (console_debug) console.log(error);
			
		});
	}
	
	
	
	var setOfflineContacts = function() {
		if (console_debug) console.log("setOfflineContacts");
		var profile = store.get('profile');
		//get offline users contacts, make sure the user who's data is in the store is the same as the logged in user
		var contacts = store.get("contacts");
		if (contacts && $rootScope.user_id == profile.user_id) {
			$rootScope.contacts = contacts;
		}
	}
	
	var setupFirebaseUser = function() {
		if (console_debug) console.log("setupFirebaseUser: new user added.");
		var usersFire = new Firebase(firebaseBase+"/users");
		usersFire.child(auth.profile.user_id).set(1);
	}

	var setupFirebaseLocation = function() {
		if (console_debug) console.log("setupFirebaseLocation");
		var locationsFire = new Firebase(firebaseBase+"/locations");
		var fire = $firebaseArray(locationsFire);
		if (fire.$indexFor(auth.profile.user_id) === -1) {
			if (console_debug) console.log("setupFirebaseLocation: fire.$indexFor(auth.profile.user_id) is -1");
			if (console_debug) console.log("setupFirebaseLocation: putting location in scope");
			$rootScope.position = "-26.217640,28.040583";
			$rootScope.accuracy = 20037509;
			$rootScope.timestamp = 0;
			
			if (console_debug) console.log("setupFirebaseLocation: putting location in firebase");
			locationsFire.child(auth.profile.user_id).set({
				accuracy: $rootScope.accuracy,
				latlng: $rootScope.position,
				updated: $rootScope.timestamp
			});
			
			if (console_debug) console.log("setupFirebaseLocation: putting location in store");
			store.set('location', {
				position: $rootScope.position,
				accuracy: $rootScope.accuracy,
				timestamp: $rootScope.timestamp
			});
		}
	};
	
	var setupFirebaseSharing = function() {
		if (console_debug) console.log("setupFirebaseSharing");
		// Try to create imsharingwith, but only if it does not exist already		
		var imsharingwithFire = new Firebase(firebaseBase+"/imsharingwith");
		var fire1 = $firebaseArray(imsharingwithFire);
		if (fire1.$indexFor(auth.profile.user_id) === -1) {
			if (console_debug) console.log("setupFirebaseSharing.imsharingwith: fire.$indexFor(auth.profile.user_id) is -1");
			var cids = Object.keys($rootScope.contacts);			
			for (var i=0; i<cids.length; i++) {
				if (console_debug) console.log("setupFirebaseSharing.imsharingwith: putting in scope and store");
				if ($rootScope.contacts[cids[i]]) {
					$rootScope.contacts[cids[i]].imsharingwith = 0;
					$rootScope.contacts[cids[i]].sharing = 0;
				}
				
				if (console_debug) console.log("setupFirebaseSharing.imsharingwith: putting in firebase");				
				//both ways
				imsharingwithFire.child(auth.profile.user_id).child(cids[i]).set(0);
				//should overwrite if exists
				imsharingwithFire.child(cids[i]).child(auth.profile.user_id).set(0);
			}
		};
		
		// Try to create sharingwithme, but only if it does not exist already		
		var sharingwithmeFire = new Firebase(firebaseBase+"/sharingwithme");
		var fire2 = $firebaseArray(sharingwithmeFire);
		if (fire2.$indexFor(auth.profile.user_id) === -1) {
			if (console_debug) console.log("setupFirebaseSharing.sharingwithme: fire.$indexFor(auth.profile.user_id) is -1");
			var cids = Object.keys($rootScope.contacts);			
			for (var i=0; i<cids.length; i++) {
				if (console_debug) console.log("setupFirebaseSharing.sharingwithme: putting in scope and store");
				if ($rootScope.contacts[cids[i]]) {
					$rootScope.contacts[cids[i]].sharingwithme = 0;
					$rootScope.contacts[cids[i]].sharing = 0;
				}
				
				if (console_debug) console.log("setupFirebaseSharing.sharingwithme: putting in firebase");
				//both ways
				sharingwithmeFire.child(auth.profile.user_id).child(cids[i]).set(0);
				//should overwrite if exists
				sharingwithmeFire.child(cids[i]).child(auth.profile.user_id).set(0);
			}
		};
	}

	var setupFirebaseLocationSharingWatcher = function() {
		if (console_debug) console.log("setupFirebaseLocationSharingWatcher");
		/*
		need a way to watch the two apis seperately yet still bind their data to the scope
		which requires processing of both datasets together.
		The map will only fetch locations for users with sharing value 2

		sharing = imsharingwith (+ or -) sharingwithme

		imsharingwith	|	sharingwithme	|	method			|	sharing
				1		|			1		|	same so add		|	2
				0		|			1		|	not so subtract	|	-1
				1		|			0		|	not so subtract	|	1
				0		|			0		|	same so add		|	0
		*/
		
		
		//also keep track of watchers for users locations, destroy unused ones, add new ones
		if (!$rootScope.locationWatchers) {
			$rootScope.locationWatchers = {};
		}

		//get online users imsharingwith and bind to it	
		if (!$rootScope.fireISW || ($rootScope.fireISW && !$rootScope.fireISW.$ref()) || $rootScope.fireISW.$ref().path.w[1] != auth.profile.user_id) {
			if (console_debug) console.log("creating new fireISW");
			$rootScope.fireISW = $firebaseArray(new Firebase(firebaseBase+"/imsharingwith/"+auth.profile.user_id));
			$rootScope.fireISW.$watch(function(event) {
				if ((event.event == "child_added" || event.event == "child_changed") && $rootScope.contacts[event.key]) {
					var contact_id = event.key;
					var sharing = $rootScope.fireISW.$getRecord(contact_id);
					if (sharing && sharing.$value == 1) {
						//add the values together
						if ($rootScope.contacts[contact_id].sharingwithme == 1) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-danger form-control";
							$rootScope.contacts[contact_id].sharing = sharing.$value + $rootScope.contacts[contact_id].sharingwithme;
							$rootScope.contacts[contact_id].shareBtnText = "Stop";
							$rootScope.contacts[contact_id].shareBtnMethod = "stop";
							$rootScope.contacts[contact_id].shareStatus = "Sharing locations.";					
							
							var fire = $firebaseObject(new Firebase(firebaseBase+"/locations/"+contact_id+"/latlng"));
							if (console_debug) console.log("watching location for user: "+contact_id);
							$rootScope.locationWatchers[contact_id] = {};
							$rootScope.locationWatchers[contact_id].unwatch = fire.$watch(function() {
								//if (event.event == "child_changed") {
									if (console_debug) console.log("new location for user: "+contact_id);
									if (console_debug) console.log(fire.$value);
									var ll = fire.$value.replace(/ /g,'').split(",");
									var lat = parseFloat(ll[0]);
									var lng = parseFloat(ll[1]);
									$rootScope.contacts[contact_id].latlng = lat+","+lng;
									if ($rootScope.map && 
									$rootScope.map.markers && 
									$rootScope.map.markers[contact_id]) {
										var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
										$rootScope.map.markers[contact_id].setPosition(pos);
										
										if (console_debug) console.log(store.get("following"));
										if (console_debug) console.log(contact_id);
										if (store.get("following") && store.get("following") == contact_id) {
											$rootScope.map.setCenter(pos);
										}
									}
								//}
							});
						}
						//subtract the values
						if ($rootScope.contacts[contact_id].sharingwithme == 0) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-danger form-control";
							$rootScope.contacts[contact_id].sharing = sharing.$value - $rootScope.contacts[contact_id].sharingwithme;
							$rootScope.contacts[contact_id].shareBtnText = "Cancel";
							$rootScope.contacts[contact_id].shareBtnMethod = "cancel";
							$rootScope.contacts[contact_id].shareStatus = "Share requested.";
						}
						$rootScope.contacts[contact_id].imsharingwith = sharing.$value;
					}
					if (sharing && sharing.$value == 0) {
			
						//add the values together
						if ($rootScope.contacts[contact_id].sharingwithme == 0) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-primary form-control";
							$rootScope.contacts[contact_id].sharing = sharing.$value + $rootScope.contacts[contact_id].sharingwithme;
							$rootScope.contacts[contact_id].shareBtnText = "Share";
							$rootScope.contacts[contact_id].shareBtnMethod = "share";
							$rootScope.contacts[contact_id].shareStatus = "";
						
							//check if we have a watcher for this contacts location
							//if we do then remove it
							if ($rootScope.locationWatchers[contact_id]) {
								if (console_debug) console.log("destroying location for user: "+contact_id);
								$rootScope.locationWatchers[contact_id].unwatch();
							}
						}
						//subtract the values
						if ($rootScope.contacts[contact_id].sharingwithme == 1) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-primary form-control";
							$rootScope.contacts[contact_id].sharing = sharing.$value - $rootScope.contacts[contact_id].sharingwithme;
							$rootScope.contacts[contact_id].shareBtnText = "Accept";
							$rootScope.contacts[contact_id].shareBtnMethod = "accept";
							$rootScope.contacts[contact_id].shareStatus = "Share request received.";
						}
						$rootScope.contacts[contact_id].imsharingwith = sharing.$value;
					}
					else {

					}
					if (console_debug) console.log("contact sharing changed");
					if (console_debug) console.log($rootScope.contacts);
					$rootScope.contacts[contact_id].id = contact_id;
					store.set('contacts', $rootScope.contacts);
				}
			});
		}

		//get online users sharingwithme
		if (!$rootScope.fireSWM || ($rootScope.fireSWM && !$rootScope.fireSWM.$ref()) || $rootScope.fireSWM.$ref().path.w[1] != auth.profile.user_id) {
			if (console_debug) console.log("creating new fireSWM");
			$rootScope.fireSWM = $firebaseArray(new Firebase(firebaseBase+"/sharingwithme/"+auth.profile.user_id));
			$rootScope.fireSWM.$watch(function(event) {
				if (event.event == "child_added" || event.event == "child_changed") {
					var contact_id = event.key;
					var sharing = $rootScope.fireSWM.$getRecord(contact_id);
					if (sharing && sharing.$value == 1) {
						//add the values together
						if ($rootScope.contacts[contact_id].imsharingwith == 1) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-danger form-control";
							$rootScope.contacts[contact_id].sharing = sharing.$value + $rootScope.contacts[contact_id].imsharingwith;
							$rootScope.contacts[contact_id].shareBtnText = "Stop";
							$rootScope.contacts[contact_id].shareBtnMethod = "stop";
							$rootScope.contacts[contact_id].shareStatus = "Sharing locations.";
						
						
							var fire = $firebaseObject(new Firebase(firebaseBase+"/locations/"+contact_id+"/latlng"));
							if (console_debug) console.log("watching location for user: "+contact_id);
							$rootScope.locationWatchers[contact_id] = {};
							$rootScope.locationWatchers[contact_id].unwatch = fire.$watch(function() {
								//if (event.event == "child_changed") {
									if (console_debug) console.log("new location for user: "+contact_id);
									if (console_debug) console.log(fire.$value);
									var ll = fire.$value.replace(/ /g,'').split(",");
									var lat = parseFloat(ll[0]);
									var lng = parseFloat(ll[1]);
									$rootScope.contacts[contact_id].latlng = lat+","+lng;
									if ($rootScope.map && 
									$rootScope.map.markers && 
									$rootScope.map.markers[contact_id]) {
										var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
										$rootScope.map.markers[contact_id].setPosition(pos);
										
										if (console_debug) console.log(store.get("following"));
										if (console_debug) console.log(contact_id);
										if (store.get("following") && store.get("following") == contact_id) {
											$rootScope.map.setCenter(pos);
										}
									}
								//}
							});
						
						}
						//subtract the values
						if ($rootScope.contacts[contact_id].imsharingwith == 0) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-primary form-control";
							$rootScope.contacts[contact_id].sharing = sharing.$value - $rootScope.contacts[contact_id].imsharingwith;
							$rootScope.contacts[contact_id].shareBtnText = "Accept";
							$rootScope.contacts[contact_id].shareBtnMethod = "accept";
							$rootScope.contacts[contact_id].shareStatus = "Share request received.";
						}
						$rootScope.contacts[contact_id].sharingwithme = sharing.$value;
					}
					if (sharing && sharing.$value == 0) {
						//add the values together
						if ($rootScope.contacts[contact_id].imsharingwith == 0) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-primary form-control";
							$rootScope.contacts[contact_id].sharing = sharing.$value + $rootScope.contacts[contact_id].imsharingwith;
							$rootScope.contacts[contact_id].shareBtnText = "Share";
							$rootScope.contacts[contact_id].shareBtnMethod = "share";
							$rootScope.contacts[contact_id].shareStatus = "";
						
							//check if we have a watcher for this contacts location
							//if we do then remove it
							if ($rootScope.locationWatchers[contact_id]) {
								if (console_debug) console.log($rootScope.locationWatchers);
								if (console_debug) console.log("destroying location for user: "+contact_id);
								$rootScope.locationWatchers[contact_id].unwatch();
							}
						}
						//subtract the values
						if ($rootScope.contacts[contact_id].imsharingwith == 1) {
							$rootScope.contacts[contact_id].btnClass = "btn btn-danger form-control";
							$rootScope.contacts[contact_id].sharing = $rootScope.contacts[contact_id].imsharingwith - sharing.$value;
							$rootScope.contacts[contact_id].shareBtnText = "Cancel";
							$rootScope.contacts[contact_id].shareBtnMethod = "cancel";
							$rootScope.contacts[contact_id].shareStatus = "Share request sent.";
						}
						$rootScope.contacts[contact_id].sharingwithme = sharing.$value;
					}
					else {

					}
					if (console_debug) console.log("contact sharing changed");
					store.set('contacts', $rootScope.contacts);
				}
			});
		}
	}
	
	$rootScope.initialiseContactsMarkers = function(event, map) {
		if (console_debug) console.log("initialiseContactsMarkers");
		$rootScope.map = map;
		var following = store.get("following");
		
		if ($rootScope.contacts && $rootScope.contacts[following] && $rootScope.contacts[following].latlng) {
			var ll = $rootScope.contacts[following].latlng.replace(/ /g,'').split(",");
			var lat = parseFloat(ll[0]);
			var lng = parseFloat(ll[1]);
			var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
			$rootScope.map.setCenter(pos);
		}
		else {
			store.set("following", auth.profile.user_id);
			if ($rootScope.position) {
				var ll = $rootScope.position.replace(/ /g,'').split(",");
				var lat = parseFloat(ll[0]);
				var lng = parseFloat(ll[1]);
				var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
				$rootScope.map.setCenter(pos);
			}
		}
		
		if (!$rootScope.map.markers || !$rootScope.map.markers[auth.profile.user_id]) {
		
			var ll = $rootScope.position.replace(/ /g,'').split(",");
			var lat = parseFloat(ll[0]);
			var lng = parseFloat(ll[1]);
			var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));

			var marker = new Marker({
				position: pos,
				map: $rootScope.map,
				zIndex: 9,
				icon: {
					path: MAP_PIN,
					fillColor: '#0E77E9',
					fillOpacity: 1,
					strokeColor: '',
					strokeWeight: 0,
					scale: 1/2
				},
				label: "<img src='"+auth.profile.picture+"' class='marker-label'/>"
			});
			$rootScope.map.markers[auth.profile.user_id] = marker;
		}
	
		if ($rootScope.contacts) {
			var keys = Object.keys($rootScope.contacts);
			for (var i=0; i<keys.length; i++) {
				if ( $rootScope.contacts[keys[i]] && $rootScope.contacts[keys[i]].sharing == 2 && ( !$rootScope.map.markers || !$rootScope.map.markers[keys[i]] ) ) {
					var img = $rootScope.contacts[keys[i]].icon;
	
					var ll = $rootScope.contacts[keys[i]].latlng.replace(/ /g,'').split(",");
					var lat = parseFloat(ll[0]);
					var lng = parseFloat(ll[1]);
					var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
	
					var marker = new Marker({
						position: pos,
						map: $rootScope.map,
						zIndex: 9,
						icon: {
							path: MAP_PIN,
							fillColor: '#0E77E9',
							fillOpacity: 1,
							strokeColor: '',
							strokeWeight: 0,
							scale: 1/2
						},
						label: "<img src='"+img+"' class='marker-label'/>"
					});
					$rootScope.map.markers[keys[i]] = marker;
				}
			}
		}
		
		$rootScope.$apply();
	}
	
	
});

