/*jshint esversion: 6 */
/* global angular */
/* global console */
/* global $ */


'use strict';

angular.module('vidprog')

  .controller('HeaderController', ['$scope', '$state', '$stateParams', '$rootScope',
    'ngDialog', 'AuthFactory', function ($scope, $state, $stateParams, $rootScope, ngDialog,
      AuthFactory) {

      $rootScope.loggedIn = false;
      $scope.username = '';

      if (AuthFactory.isAuthenticated()) {
        $rootScope.loggedIn = true;
        $scope.username = AuthFactory.getUsername();
      }

      $scope.openLogin = function () {
        ngDialog.open({
          template: 'views/login.html',
          controller: "LoginController"
        });

      };

      $scope.logOut = function () {
        AuthFactory.logout();
        $rootScope.loggedIn = false;
        $scope.username = '';

        $state.reload();

      };

      $rootScope.$on('login:Successful', function () {
        $rootScope.loggedIn = AuthFactory.isAuthenticated();
        $scope.username = AuthFactory.getUsername();

        //  console.log("logged in okay");

        $state.reload();

      });

      $rootScope.$on('registration:Successful', function () {
        $rootScope.loggedIn = AuthFactory.isAuthenticated();
        $scope.username = AuthFactory.getUsername();
      });

      $scope.stateis = function (curstate) {
        return $state.is(curstate);
      };

    }])

  .controller('LoginController', ['$scope', '$rootScope', '$state', '$stateParams',
    'ngDialog', '$localStorage', 'AuthFactory', 'vcRecaptchaService', 'captchaFactory',
    function ($scope, $rootScope, $state, $stateParams, ngDialog, $localStorage,
      AuthFactory, vcRecaptchaService, captchaFactory) {

      $scope.loginData = $localStorage.getObject('userinfo', '{}');

      $scope.loginData = {};

      //reset form
      $scope.loginData.username = '';
      $scope.loginData.password = '';
      $scope.loginData.email = '';
      $scope.loginChannel = "sign_in"; //inits radio button


      $scope.response = null;
      $scope.widgetId = null;

      //reset the modal
      $("#loginmodal").on('hidden.bs.modal', function () {
        $state.reload();  //reset the modal

      });


      $scope.model = {
        key: '6Lf_PkwUAAAAANGSbb7xPTozgUYNjUyTBUu_5hEl'
      };

      $scope.setResponse = function (response) {
        console.info('Response available');
        $scope.response = response;
      };

      $scope.setWidgetId = function (widgetId) {
        console.info('Created widget ID: %s', widgetId);
        $scope.widgetId = widgetId;
      };

      $scope.cbExpiration = function () {
        console.info('Captcha expired. Resetting response object');
        vcRecaptchaService.reload($scope.widgetId);
        $scope.response = null;
      };



      $scope.signIn = function () {
        //     console.log("in 1");
        if (!validateEmail($scope.loginData.email) && ($scope.loginChannel == "sign_up")) {
          $scope.loginForm.email.$invalid = true; //turn the input red
          $scope.loginForm.email.$pristine = false;
          $scope.alert = false;
        } else {


          doUser();

        }
      };


      var doUser = function () {


        //can branch between login and register here
        if ($scope.loginChannel == "sign_in") {

          $scope.doLogin();

          //close the modal when done
          $('#loginmodal').modal('hide');
        }
        else {

          //send captcha to google and if good result register user in promise
          if ($scope.response) { //make sure first response has returned from google.
            getCaptchaResult();
            //close the modal when done
            $('#loginmodal').modal('hide');
          }
        }

      };

      var validateEmail = function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
        // return true;

      };



      $scope.doLogin = function () {
        if ($scope.rememberMe)
          $localStorage.storeObject('userinfo', $scope.loginData);

        AuthFactory.login($scope.loginData);

      };

      $scope.doRegister = function () {

        console.log('Doing registration  -->' + angular.toJson($scope.loginData));

        AuthFactory.register($scope.loginData);

      };




      function getCaptchaResult() {

        //       console.log('sending the captcha response to the server', $scope.response);

        //post captcha result to server which will post to google for test
        captchaFactory.save({}, {
          'captchaResponse': $scope.response
        })
          .$promise.then(
            function (response) {
              //SUCCESS
              console.log("success ==  " + response.success);

              if (response.success == true) {

                $scope.doRegister(); //needs to be inside promise
              }
            },
            //FAILED
            function (error) {

              console.log(error);
              // In case of a failed validation reload the captcha
              // because each response can be checked just once
              vcRecaptchaService.reload($scope.widgetId);
            });

      };

    }])


  .controller('AddController', ['sharedProperties', '$timeout', '$filter', '$scope',
    '$rootScope', '$state', '$http', '$stateParams', 'videoFactory', 'editFactory', 'AuthFactory',
    function (sharedProperties, $timeout, $filter, $scope, $rootScope, $state, $http,
      $stateParams, videoFactory, editFactory, AuthFactory) {

      var temp = [];

      //empty object allows first input field to display
      $scope.newVid = [{}];

      //if logged out and got here from back button
      if (!AuthFactory.isAuthenticated()) {
        $state.go('app');
      }

      $scope.addNewChoice = function () {
        $scope.newVid.push({
          "videoName": $scope.newVid.videoName,
          "videoURL": $scope.newVid.videoURL
        });
      };

      $scope.saveNewList = function () {

        for (var i = 0; i < $scope.newVid.length; i++) {
          if (!$scope.newVid[i].videoName)
            $scope.newVid[i].videoName = ""; //insures appears in object
          if ($scope.newVid[i].videoURL)
            temp.push($scope.newVid[i]);
        }

        $scope.newVid = temp;

        //if empty list don't save, just return to main screen
        if ($scope.newVid.length == 0) {
          //  console.log("len0");
          $state.go('app');
          return; //necessary for some reason
        }

        //save the new list to db
        var newListOfVids = {
          listName: $rootScope.newListName,
          listOfVids: $scope.newVid
        };

        videoFactory.update({
          id: $stateParams.id
        }, newListOfVids)
          .$promise.then(
            function () {
              //SUCCESS
            },
            //FAILED
            function (response) {

              console.log(response.status);

            });

        $state.go('app');

      };

      //Cancel button
      $scope.goBack = function () {
        $state.go('app');
      };


    }])


  .controller('EditController', ['sharedProperties', '$timeout', '$filter', '$scope',
    '$rootScope', '$http', '$stateParams', 'videoFactory', 'editFactory', 'AuthFactory',
    '$state', function (sharedProperties, $timeout, $filter, $scope, $rootScope, $http,
      $stateParams, videoFactory, editFactory, AuthFactory, $state) {

      $scope.list = [];
      $scope.listName = '';
      //empty object allows first input field to display
      $scope.newVid = [{}];

      $scope.newVid = sharedProperties.data.list;
      $scope.listName = sharedProperties.data.listName;
      $scope.listId = sharedProperties.data.listId;

      var temp = [];

      //if logged out and got here from back button
      if (!AuthFactory.isAuthenticated()) {
        $state.go('app');
      }



      $scope.addNewChoice = function () {
        $scope.newVid.push({
          "videoName": $scope.newVid.videoName,
          "videoURL": $scope.newVid.videoURL
        });
      };

      $scope.saveList = function () {

        for (var i = 0; i < $scope.newVid.length; i++) {
          if (!$scope.newVid[i].videoName)
            $scope.newVid[i].videoName = ""; //insures appears in object
          if ($scope.newVid[i].videoURL)
            temp.push($scope.newVid[i]);
        }

        $scope.newVid = temp;


        //save the new list to db
        var newListOfVids = {
          listName: $scope.listName,
          listOfVids: $scope.newVid
        };

        console.log(angular.toJson(newListOfVids));

        //   console.log("--stateparams -->   " + JSON.stringify($stateParams));


        editFactory.update({ listId: $scope.listId }, newListOfVids)
          .$promise.then(
            function () {
              //SUCCESS

            },
            //FAILED
            function (response) {

              console.log(response.status);

            });

        $state.go('app');

      };

      //Cancel button
      $scope.goBack = function () {
        $state.go('app');
      };


    }])



  .controller('ContentController', ['sharedProperties', '$timeout', '$scope',
    '$rootScope', '$state', '$http', '$stateParams', 'videoFactory', 'AuthFactory',
    function (sharedProperties, $timeout, $scope, $rootScope, $state, $http, $stateParams,
      videoFactory, AuthFactory) {

      $scope.listNames = [];
      $scope.username = undefined;

      //$scope.loaded = undefined;
      $scope.displayListName = undefined;

      var tmpList = [];

      $scope.list = [];
      $scope.showInput = false;

      var videoList = {};
      $scope.message = "Loading ...";
      //  console.log("at 1");
      $scope.showDuplicateNameErrorBox = false;



      if (AuthFactory.isAuthenticated()) {
        $rootScope.loggedIn = true;
        $scope.username = AuthFactory.getUsername();
      }


      //start with video of static
      $scope.playerVars = {
        autoplay: 1,
        mute: 1
      };
      $scope.vidToPlay = "bf7NbRFyg3Y"; // go to this video

      videoList = videoFactory.get({
        /* id: $stateParams.id */
        //   id: '5a4e50090d48e31660a0ae6a'
        //  id: 0
      })
        .$promise.then(
          function (response) {
            videoList = response;

            // create list names for buttons at top of home screen
            for (var i = 0; i < response.listOfLists.length; i++) {
              $scope.listNames.push(response.listOfLists[i].listName);
            }
          },
          function (response) {
            $scope.message = "Error: " + response.status + " " + response.statusText;
          }
        );



      $scope.addItem = function () {
        //    console.log("GOT CLICK");
        $scope.list.push({
          "videoName": " ",
          "videoURL": " ",
          "thumb": " "
        });
      };



      // this gets list selection from button list html and starts the first
      // video in list playing
      $scope.selectListAndStartVid = function (listIndex) {
        $scope.closeAllDialogs();
        $scope.displayListName = $scope.listNames[listIndex];
        //  $scope.loaded = $scope.displayListName;

        //unmute from initial video of muted static
        $scope.playerVars = {
          autoplay: 1,
          mute: 0
        };

        $scope.loadArray(listIndex);
        $scope.select($scope.list[0], 0);
      };



      $scope.editListFun = function () {
        //disallow if user not logged in
        if (!AuthFactory.getUsername())
          return;
        $scope.closeAllDialogs();

        //do not go to edit page if video list is not loaded (in player)
        if (!$scope.displayListName) {
          $scope.hideDupErrBox(); //close list input box if it is open

          return;
        } else {
          //make sure array is loaded w/ current playing list
          //and then transition to list editing page

          $state.go('app.editList');

        }
      };



      //show the input field for the new list name
      $scope.showNameBoxFun = function () {

        //disallow if user not logged in
        if (!AuthFactory.getUsername())
          return;

        $scope.hideDupErrBox();


        if ($scope.showInput == true)
          $scope.showInput = false;
        else
          $scope.showInput = true;
        $scope.newListName = "";
      };



      $scope.closeAllDialogs = function () {
        $scope.hideDupErrBox();

        //hides input box for new list name
        $scope.showInput = false;
        $scope.newListName = "";

      };


      $scope.hideDupErrBox = function () {
        $scope.showDuplicateNameErrorBox = false;

      };


      //response to "go" button, to create new list
      $scope.newListNameFun = function () {

        //disallow if user not logged in
        if (!AuthFactory.getUsername())
          return;

        $scope.hideDupErrBox();

        if (!$scope.newListName) {

          return;
        }

        //first see if list name already exists.  If it does, clear input box and display
        //error message 
        if ($scope.listNames.indexOf($scope.newListName) != -1) {
          $scope.showDuplicateNameErrorBox = true;

        } else {
          $scope.showInput = false;
          $scope.listNames.push($scope.newListName);
          $rootScope.newListName = $scope.newListName;

          $state.go('app.createList');

        }
      };



      $scope.loadArray = function (listsIndex) {
        $scope.list.length = 0; //empty the array

        //load binding array
        for (var i = 0; i < videoList.listOfLists[listsIndex].listOfVids.length; i++) {

          //see if name is only a space -- if it is then change it to code for 
          //&nbsp so browser won't trim it
          var temp = fixNameLen(videoList.listOfLists[listsIndex].listOfVids[i].videoName).trim();
          if (!temp)
            temp = '\u00A0'; //&nbsp to avoid trimming by browser

          $scope.list.push({
            //       "ID": videoList.listOfLists[listsIndex].listOfVids[i]._id,
            "videoName": temp,
            "videoURL": videoList.listOfLists[listsIndex].listOfVids[i].videoURL,
            "thumb": makeThumbURL(videoList.listOfLists[listsIndex].listOfVids[i].videoURL)
          });
        }

        //to share data with other controllers
        sharedProperties.data.listName = videoList.listOfLists[listsIndex].listName;
        sharedProperties.data.list = $scope.list;
        sharedProperties.data.listId = videoList.listOfLists[listsIndex]._id;

      };


      $scope.$on('youtube.player.error', function (event, data) {
        console.log('error handler');
        $timeout(function () {
          advanceVideo();
        }, 5000);
        //  advanceVideo();

      });

      $scope.$on('youtube.player.paused', function (event, data) {
        //   console.log('paused');
        /*    var i = getSelectedIndex();
            console.log(i);
            console.log($scope.list[i].videoURL);*/
      });


      $scope.$on('youtube.player.ended', function (event, data) {
        advanceVideo();
      });



      function advanceVideo() {
        for (var i = 0; i < $scope.list.length; i++) {
          if (i >= $scope.list.length) { // if at end of list
            $scope.selected = null;
            return;
          }
          if ($scope.isActive($scope.list[i])) {
            /*  console.log(i);*/
            $scope.selected = null;
            $scope.selected = $scope.list[i + 1];
            $scope.vidToPlay = youtubeParser($scope.list[i + 1].videoURL); // go to this video
            break;
          }
        }
      }



      $scope.select = function (xitem, index) {

        //   console.log(angular.toJson(xitem) +"     " + index);
        $scope.selected = xitem; //will be highlighted in list
        $scope.vidToPlay = youtubeParser($scope.list[index].videoURL); // go to this video
      };


      $scope.isActive = function (xitem) {
        return $scope.selected === xitem;
      };



      function fixNameLen(videoName) {
        if (videoName.length > 80) {
          videoName = videoName.substring(0, 80);
          videoName = videoName + "...";
        }
        return videoName;
      }


      $scope.list = tmpList;

      $scope.sortingLog = [];

      $scope.sortableOptions = {
        update: function (e, ui) {
          var logEntry = tmpList.map(function (i) {
            return i.value;
          }).join(', ');
          $scope.sortingLog.push('Update: ' + logEntry);
        },
        stop: function (e, ui) {
          // this callback has the changed model
          var logEntry = tmpList.map(function (i) {
            return i.value;
          }).join(', ');
          $scope.sortingLog.push('Stop: ' + logEntry);
        }
      };


      function makeThumbURL(vidURL) {
        return "https://img.youtube.com/vi/" + youtubeParser(vidURL) + "/default.jpg";
      }


      //return video identifier from video url
      function youtubeParser(videoURL) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11,11}).*/;
        var match = videoURL.match(regExp);
        if (match)
          if (match.length >= 2) return match[2];

        regExp = /^.*(y2u.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11,11}).*/;
        match = videoURL.match(regExp);
        if (match)
          if (match.length >= 2) return match[2];

        return videoURL; //in case just video identifier was passed in

      }

    }]);