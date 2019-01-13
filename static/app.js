'use strict';

// Initialize Material Design Components
$(document).ready(function() {
    $.material.init();
    var element = document.getElementById('link_whowas_parse')
    var newElement = '<h2 id="alphaLabel" class = "label">Alpha</h2>'
    element.insertAdjacentHTML( 'afterbegin', newElement )
});





function SubForm_Whowas(e)
{
    document.getElementById('whowas_search_send').disabled = true;
    document.getElementById('whowas-search-results-content').innerHTML = "";
    document.getElementById('whowas-search-results-content-log').innerHTML = "";
    $('#whowas-search-spinner').css("visibility", "visible");
    $.ajax({
        url:'/whowas_searches',
        type:'post',
        data:$('#new_whowas_search').serialize(),
        success:function(response){
            $('#whowas-search-spinner').css("visibility", "hidden");
            document.getElementById('whowas_search_send').disabled = false;
            //console.log(response);
            var user = response._source.username;     
            document.getElementById('whowas-search-results-content-log').innerHTML = JSON.stringify(response, null, "\t");
            var text = "<br><br>Username: " + user;     
            document.getElementById('whowas-search-results-content').innerHTML = text;
        },
        error: function (jqXHR, exception) {
            document.getElementById('whowas_search_send').disabled = false;
            $('#whowas-search-spinner').css("visibility", "hidden");
            var text = JSON.stringify(JSON.parse(jqXHR.responseText), null, "\t");
            document.getElementById('whowas-search-results-content-log').innerHTML = text;
        }
    });
};


function SubForm_Whowas_parse(e) {
    document.getElementById('whowas_search_send').disabled = true;
    document.getElementById('whowas-search-results-content').innerHTML = "";
    document.getElementById('whowas-search-results-content-log').innerHTML = "";
    $('#whowas-search-spinner').css("visibility", "visible");
    var input = $('#whowas_search_parse').val() + "\n";

    var ip_addr = input.substring(input.indexOf("IP Address:"), input.length)
    ip_addr = ip_addr.substring(ip_addr.indexOf("IP Address:") + ("IP Address:").length, ip_addr.indexOf("\n"));
    ip_addr = ip_addr.replace(/\s\s+/g, "");

    var port = input.substring(input.indexOf("Port:"), input.length)
    port = port.substring(port.indexOf("Port:") + ("Port:").length, port.indexOf("\n"));
    port = port.replace(/\s\s+/g, "");

    var timestamp = input.substring(input.indexOf("Timestamp:"), input.length)
    timestamp = timestamp.substring(timestamp.indexOf("Timestamp:") + ("Timestamp:").length, timestamp.indexOf("\n"));
    timestamp = timestamp.replace(/\s\s+/g, "");


    var payload = "utf8=" + $('#utf8input').val() + "&whowas_search[ip]=" + ip_addr + "&whowas_search[port]=" + port + "&whowas_search[timestamp]=" + timestamp;
    $.ajax({
        url:'/whowas_searches',
        type:'post',
        data:payload,
        success:function(response){
            document.getElementById('whowas_search_send').disabled = false;
            $('#whowas-search-spinner').css("visibility", "hidden");
            console.log(response);
            var user = response._source.username;  
            document.getElementById('whowas-search-results-content-log').innerHTML = JSON.stringify(response, null, "\t");
            var text = "<br><br>Username: " + user;     
            document.getElementById('whowas-search-results-content').innerHTML = text;

        },
        error: function (jqXHR, exception) {
            document.getElementById('whowas_search_send').disabled = false;
            $('#whowas-search-spinner').css("visibility", "hidden");
            console.log(jqXHR);
            var text = JSON.stringify(JSON.parse(jqXHR.responseText), null, "\t");
            document.getElementById('whowas-search-results-content-log').innerHTML = text;
        }
    });
}




/////////////////////////////////////////////////////////////////////
// STATIC GLOBALS
/////////////////////////////////////////////////////////////////////

// Software Version, Displayed in Footer
var VERSION = '1.0.0';

/////////////////////////////////////////////////////////////////////
// ANGULAR APP CODE
/////////////////////////////////////////////////////////////////////

// Initialize App Module
var app = angular.module('app', [
    'ngRoute',
    'ngSanitize',
    'angular-click-outside',
    '720kb.tooltips',
    'app.main',
    'app.core'
    //app.services
]);

// App Routes
app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
          when('/login', {
            templateUrl: 'templates/login.html',
            controller: 'app.main.todayView'
          }).
          when('/whowas', {
            templateUrl: 'templates/whowas.html',
            controller: 'app.main.whowas'
            
          }).
          when('/whowas_parse', {
            templateUrl: 'templates/whowas_parse.html',
            controller: 'app.main.whowasParse'
            
          }).
          otherwise({
            redirectTo: '/whowas'
          });
    }]);

// Controllers
var main = angular.module('app.main', []);
var core = angular.module('app.core', []);

// Puts Version Number in Footer
core.controller('app.core.version', function($scope) {
    $scope.version = VERSION;
})

// Generates Navigation Bar at Top
core.controller('app.core.nav', function($scope, $rootScope) {
    $scope.menuItems = [
        { url: '/#/whowas', text: 'Whowas', mode: 'Whowas', id: 'link_whowas' },
        { url: '/#/whowas_parse', text: 'Whowas Parse', mode: 'Whowas Parse', id: 'link_whowas_parse' }
    ];
})

main.controller('app.main.todayView', [function ($scope, $controller, Articles, $rootScope) {

}]);

main.controller('app.main.whowas', function($cookies, $scope) {
    $rootScope.viewMode = 'Whowas';
    //$scope.csrftoken = $cookies._csrf
  }
);

main.controller('app.main.whowasPrase', function($cookies, $scope) {
    $rootScope.viewMode = 'Whowas Parse';
    //$scope.csrftoken = $cookies._csrf
  }
);












