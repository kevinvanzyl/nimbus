'use strict';

/* Controllers */

var whereappControllers = angular.module('whereappControllers', []);

whereappControllers.controller('HeaderCtrl', ['$scope', 'auth', 'store','$location',  
	function($scope, auth, store, $location) { 
		
		//set the active tab
		$scope.isActive = function (viewLocation) { 
		    return ($location.path().indexOf(viewLocation) >= 0);
		}
}]);
 
whereappControllers.controller('ContactListCtrl', ['$routeParams', '$scope', 'auth', '$firebaseObject', 'firebaseBase', 'console_debug', 
function($routeParams, $scope, auth, $firebaseObject, firebaseBase, console_debug) {
	$scope.orderProp = '-lastactivitywithme';
	
	$scope.updateSharing = function(method, cid) {
		if (console_debug) console.log(method);
		if (console_debug) console.log(cid);
		
		if (method == "share") {
			$scope.share(cid);
		}
		if (method == "cancel") {
			$scope.cancel(cid);
		}
		if (method == "accept") {
			$scope.accept(cid);
		}
		if (method == "stop") {
			$scope.stop(cid);
		}
	}
	
	var firebaseBase = this.firebaseBase;
	
	$scope.share = function(cid) {		
		/*
			$scope.contacts[cid].imsharingwith = 0
			$scope.contacts[cid].sharingwithme = 0
			
			if not the case then cancel
			else 
				set firebase(imsharingwith/$scope.user_id/cid/1)
				set firebase(sharingwithme/cid/$scope.user_id/1)
		*/
		
		if (cid && $scope.contacts && $scope.contacts[cid] && $scope.user_id) {
			if ($scope.contacts[cid].imsharingwith == 0 && $scope.contacts[cid].sharingwithme == 0) {
				var fire1 = new Firebase(firebaseBase+"/imsharingwith/"+$scope.user_id);
				fire1.child(cid).set(1);	
				
				var fire2 = new Firebase(firebaseBase+"/sharingwithme/"+cid);
				fire2.child($scope.user_id).set(1);
				
				$scope.contacts[cid].imsharingwith = 1;
			}
		}
	}
	
	$scope.cancel = function(cid) {
		/*
			$scope.contacts[cid].imsharingwith = 1
			$scope.contacts[cid].sharingwithme = 0
			
			if not the case then cancel
			else 
				set firebase(imsharingwith/$scope.user_id/cid/0)
				set firebase(sharingwithme/cid/$scope.user_id/0)
		*/
		
		if (cid && $scope.contacts && $scope.contacts[cid] && $scope.user_id) {
			if ($scope.contacts[cid].imsharingwith == 1 && $scope.contacts[cid].sharingwithme == 0) {
				var fire1 = new Firebase(firebaseBase+"/imsharingwith/"+$scope.user_id);
				fire1.child(cid).set(0);	
				
				var fire2 = new Firebase(firebaseBase+"/sharingwithme/"+cid);
				fire2.child($scope.user_id).set(0);
				
				$scope.contacts[cid].imsharingwith = 0;
			}
		}
	}
	
	$scope.accept = function(cid) {
		/*
			$scope.contacts[cid].imsharingwith = 0
			$scope.contacts[cid].sharingwithme = 1
			
			if not the case then cancel
			else 
				set firebase(imsharingwith/$scope.user_id/cid/1)
				set firebase(sharingwithme/cid/$scope.user_id/1)
		*/
		
		if (cid && $scope.contacts && $scope.contacts[cid] && $scope.user_id) {
			if ($scope.contacts[cid].imsharingwith == 0 && $scope.contacts[cid].sharingwithme == 1) {
				var fire1 = new Firebase(firebaseBase+"/imsharingwith/"+$scope.user_id);
				fire1.child(cid).set(1);	
				
				var fire2 = new Firebase(firebaseBase+"/sharingwithme/"+cid);
				fire2.child($scope.user_id).set(1);
				
				$scope.contacts[cid].imsharingwith = 1;
			}
		}
	}
	
	$scope.stop = function(cid) {
		/*
			$scope.contacts[cid].imsharingwith = 1
			$scope.contacts[cid].sharingwithme = 1
			
			if not the case then cancel
			else 
				set firebase(imsharingwith/$scope.user_id/cid/0)
				set firebase(sharingwithme/$scope.user_id/cid/0)
				set firebase(imsharingwith/cid/$scope.user_id/0)
				set firebase(sharingwithme/cid/$scope.user_id/0)
		*/
		
		if (cid && $scope.contacts && $scope.contacts[cid] && $scope.user_id) {
			if ($scope.contacts[cid].imsharingwith == 1 && $scope.contacts[cid].sharingwithme == 1) {
				var fire1 = new Firebase(firebaseBase+"/imsharingwith/"+$scope.user_id);
				fire1.child(cid).set(0);	
				
				var fire2 = new Firebase(firebaseBase+"/sharingwithme/"+$scope.user_id);
				fire2.child(cid).set(0);	
				
				var fire3 = new Firebase(firebaseBase+"/imsharingwith/"+cid);
				fire3.child($scope.user_id).set(0);
				
				var fire4 = new Firebase(firebaseBase+"/sharingwithme/"+cid);
				fire4.child($scope.user_id).set(0);
				
				$scope.contacts[cid].imsharingwith = 0;
				$scope.contacts[cid].sharingwithme = 0;
			}
		}
	}
	
}]);


whereappControllers.controller('MapCtrl', ['$scope', 'store', 'auth', '$routeParams','$filter','$http','$interval', 'LocationService', '$firebaseObject', 'console_debug', 
function($scope, store, auth, $routeParams, $filter, $http, $interval,  LocationService, $firebaseObject, console_debug) {
		
		$scope.$on('mapInitialized', $scope.initialiseContactsMarkers);
		
		$scope.getFollowingPosition = function() {
			var following = store.get("following");
			if (following && $scope.contacts[following] && $scope.contacts[following].latlng) {
				return $scope.contacts[following].latlng;
			}
			
			if ($scope.position) {
				return $scope.position;
			}
			
			return "-26.217640,28.040583";
		}

		$scope.isBtnActive = function(id) {
			var following = store.get("following");
			if (!following) {
				store.set("following", auth.profile.user_id);
				following = auth.profile.user_id;
			}
			
			if (following == id) {
				return true;
			}
			else {
				return false;
			}
		}
		
		$scope.followContact = function(contact_id) {
			if (!$scope.contacts[contact_id] || !$scope.contacts[contact_id].latlng) {
				$scope.followMe();
			}
			
			store.set("following", contact_id);
			if (console_debug) console.log("following user: "+contact_id);
			if ($scope.map) {
				var ll = $scope.contacts[contact_id].latlng.replace(/ /g,'').split(",");
				var lat = parseFloat(ll[0]);
				var lng = parseFloat(ll[1]);
				var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
				if (console_debug) console.log("their position is: "+$scope.contacts[contact_id].latlng);
				$scope.map.setCenter(pos);
			}
		}
		
		$scope.followMe = function() {
			store.set("following", auth.profile.user_id);
			if (console_debug) console.log("following me ");
			if ($scope.map) {
				var ll = $scope.position.replace(/ /g,'').split(",");
				var lat = parseFloat(ll[0]);
				var lng = parseFloat(ll[1]);
				var pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
				if (console_debug) console.log("my position is: "+$scope.position);
				$scope.map.setCenter(pos);
			}
		}
}]);

whereappControllers.controller('SocialContactsCtrl', ['$scope', 'store', '$http', 'auth', 'usSpinnerService', 'console_debug', 
function($scope, store, $http, auth, usSpinnerService, console_debug) {

	$scope.initialiseSocialContacts = function() {
		$scope.orderProp = '-lastactivitywithme';
		$scope.status = "";
		$scope.btn_text = "Invite";
		
		var contacts = store.get('googleContacts');
		if (contacts && !$scope.googleContacts) {
			$scope.googleContacts = contacts;
			usSpinnerService.stop('spinner-1');
		}
		else {
			usSpinnerService.spin('spinner-1');
		}
		
		fetchGoogleContacts();
	}
	
	var fetchGoogleContacts = function() {
		var googleToken = auth.profile.identities[0].access_token;
		var user_id = auth.profile.identities[0].user_id;

		$http.jsonp("https://www.googleapis.com/plus/v1/people/"+user_id+"/people/visible?alt=json&callback=JSON_CALLBACK&access_token="+encodeURIComponent(googleToken))
		.success(function (response) {
			var entries = response.items;
			var contacts = Array();
			if (entries) {
				if (console_debug) console.log(entries);
				for (var i=0; i<entries.length; i++) {
					if (!$scope.contacts["google-oauth2|"+entries[i].id]) {
						contacts.push({name: entries[i].displayName, icon: entries[i].image.url});
					}
				}
				$scope.googleContacts = contacts;
				store.set('googleContacts', contacts);
				usSpinnerService.stop('spinner-1');
			}
		})
		.error(function(error) {
			if (console_debug) console.log("res" + JSON.stringify(error));
		});
	}

}]);
