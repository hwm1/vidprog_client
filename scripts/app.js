/*jshint esversion: 6 */  
/* global angular */ 
/* global console */

'use strict';

angular.module('vidprog', ['vcRecaptcha','ui.router', 'ngResource', 'ngDialog', 'ui.sortable', 'ui.bootstrap', 'youtube-embed'])

  .config(function ($stateProvider, $urlRouterProvider, $locationProvider) {
    
   $locationProvider.html5Mode(true);

    $stateProvider
      // route for the home page
      .state('app', {
        url: '/',
        views: {
          'header': {
            templateUrl: 'views/header.html',
            controller: 'HeaderController'

          },

          'content': {
            templateUrl: 'views/home.html',
            controller: 'ContentController'

          }
        }

      })

      .state('app.editList', {
        /*  url: 'menu/:id',*/
        /*  url: 'vlist/0',*/
        url: 'edit.html',
        views: {
          'content@': {
            templateUrl: 'views/edit.html',
            controller: 'EditController'
          }
        }
      })

      .state('app.createList', {
        /*  url: 'menu/:id',*/
        /*  url: 'vlist/0',*/
        url: 'create.html',
        views: {
          'content@': {
            templateUrl: 'views/create.html',
            controller: 'AddController'
          }
        }
      });

    $urlRouterProvider.otherwise('/');

  });