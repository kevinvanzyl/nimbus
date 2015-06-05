'use strict';

/* Services */

var whereappServices = angular.module('whereappServices', []);

whereappServices.service('ContactsService', ['$http', '$q', 'auth', '$rootScope', 'console_debug', function($http, $q, auth, $rootScope, console_debug){
	
	this.getContacts = function(googleToken, user_id) {
		var deferred = $q.defer();
		if (console_debug) console.log("User_id is: "+user_id);
		if (console_debug) console.log("GoogleToken is "+googleToken);

		$http.jsonp("https://www.googleapis.com/plus/v1/people/me/people/connected?alt=json&callback=JSON_CALLBACK&access_token="+googleToken)
		.success(function (response) {
			var entries = (response.items) ? response.items : {};
			var contacts = {};
			
			for (var i=0; i<entries.length; i++) {
				contacts["google-oauth2|"+entries[i].id] = {
					name: entries[i].displayName, 
					icon: entries[i].image.url
				};
			}
			
			if (!Object.keys(contacts).length) {
				if (response.error && Object.keys(response.error)) {
					deferred.reject("Contacts service: Nothing happened due to error: ");
					if (console_debug) console.log(response.error);
					if (response.error.code == 401) {
						$rootScope.logout();
					}
				}
			}
			
			deferred.resolve(contacts);
		})
		.error(function(error, code) {
			if (console_debug) console.log("Res: "+code);
			if (console_debug) console.log(error);
			deferred.reject("Contacts service: error making request");
		});
	
		return deferred.promise;
	}

}]);


whereappServices.service('LocationService', ['$http', 'auth', '$firebaseObject', function($http, auth, $firebaseObject) {
	
	this.postLocation = function(position, timestamp, accuracy) {
		var user_id = auth.profile.user_id;
		var fire = new Firebase("https://glaring-torch-8505.firebaseIO.com/locations/"+user_id);
		fire.set({
			latlng: position,
			updated: timestamp,
			accuracy: accuracy
		});
	}
}]);
