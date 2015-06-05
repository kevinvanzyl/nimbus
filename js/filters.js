'use strict';

/* Filters */
var nimbusFilters = angular.module('nimbusFilters', []);

nimbusFilters.filter('sharingFilter', [ function(){
		return function(input, query){
			if(!query) return input;
			var result = [];

			angular.forEach(input, function(contact){
				if(contact.sharing == query)
					result.push(contact);          
			});
			return result;
		};
}]);
