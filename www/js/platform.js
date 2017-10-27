
angular.module('cesium.platform', ['ngIdle', 'cesium.config', 'cesium.services'])

  // Translation i18n
  .config(function ($translateProvider, csConfig) {
    'ngInject';

    $translateProvider
      .uniformLanguageTag('bcp47')
      .determinePreferredLanguage()
      // Cela fait bugger les placeholder (pb d'affichage des accents en FR)
      //.useSanitizeValueStrategy('sanitize')
      .useSanitizeValueStrategy(null)
      .fallbackLanguage([csConfig.fallbackLanguage ? csConfig.fallbackLanguage : 'en'])
      .useLoaderCache(true);
  })

  .config(function($httpProvider, csConfig) {
    'ngInject';

    // Set default timeout
    $httpProvider.defaults.timeout = !!csConfig.timeout ? csConfig.timeout : 300000 /* default timeout */;

    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;

    //Remove the header used to identify ajax call  that would prevent CORS from working
    delete $httpProvider.defaults.headers.common['X-Requested-With'];

    // removeIf(no-device)
    // Group http request response processing (better performance when many request)
    $httpProvider.useApplyAsync(true);
    // endRemoveIf(no-device)
  })


  .config(function($compileProvider, csConfig) {
    'ngInject';

    $compileProvider.debugInfoEnabled(!!csConfig.debug);
  })

  .config(function($animateProvider) {
    'ngInject';

    $animateProvider.classNameFilter( /\banimate-/ );
  })

  // Configure cache (used by HTTP requests) default max age
  .config(function (CacheFactoryProvider, csConfig) {
    'ngInject';
    angular.extend(CacheFactoryProvider.defaults, { maxAge: csConfig.cacheTimeMs || 60 * 1000 /*1min*/});
  })

  // Configure screen size detection
  .config(function(screenmatchConfigProvider) {
    'ngInject';

    screenmatchConfigProvider.config.rules = 'bootstrap';
  })

  .config(function($ionicConfigProvider) {
    'ngInject';

    // JS scrolling need for iOs (see http://blog.ionic.io/native-scrolling-in-ionic-a-tale-in-rhyme/)
    var enableJsScrolling = ionic.Platform.isIOS();
    $ionicConfigProvider.scrolling.jsScrolling(enableJsScrolling);

    // Configure the view cache
    $ionicConfigProvider.views.maxCache(5);
  })

  .config(function(IdleProvider, csConfig) {
    'ngInject';

    IdleProvider.idle(csConfig.logoutIdle||10*60/*10min*/);
    IdleProvider.timeout(csConfig.logoutTimeout||15); // display warning during 15s
  })

  .factory('$exceptionHandler', function() {
    'ngInject';

    return function(exception, cause) {
      if (cause) console.error(exception, cause);
      else console.error(exception);
    };
  })


  .factory('csPlatform', function (ionicReady, $rootScope, $q, $state, $translate, $timeout, UIUtils,
                                   BMA, Device, csHttp, csConfig, csSettings, csCurrency, csWallet) {

    'ngInject';
    var
      fallbackNodeIndex = 0,
      defaultSettingsNode,
      started = false,
      startPromise,
      listeners,
      removeChangeStateListener;

    function disableChangeState() {
      if (removeChangeStateListener) return; // make sure to call this once

      var remove = $rootScope.$on('$stateChangeStart', function (event, next, nextParams, fromState) {
        if (!event.defaultPrevented && next.name !== 'app.home' && next.name !== 'app.settings') {
          event.preventDefault();
          if (startPromise) {
            startPromise.then(function() {
              $state.go(next.name, nextParams);
            });
          }
          else {
            UIUtils.loading.hide();
          }
        }
      });

      // store remove listener function
      removeChangeStateListener = remove;
    }

    function enableChangeState() {
      if (removeChangeStateListener) removeChangeStateListener();
      removeChangeStateListener = null;
    }

    // Alert user if node not reached - fix issue #
    function checkBmaNodeAlive(alive) {
      if (alive) return true;

      // Remember the default node
      defaultSettingsNode = defaultSettingsNode || csSettings.data.node;

      var fallbackNode = csSettings.data.fallbackNodes && fallbackNodeIndex < csSettings.data.fallbackNodes.length && csSettings.data.fallbackNodes[fallbackNodeIndex++];
      if (!fallbackNode) {
        throw 'ERROR.CHECK_NETWORK_CONNECTION';
      }
      var newServer = fallbackNode.host + ((!fallbackNode.port && fallbackNode.port != 80 && fallbackNode.port != 443) ? (':' + fallbackNode.port) : '');
      return $translate('CONFIRM.USE_FALLBACK_NODE', {old: BMA.server, new: newServer})
        .then(function(msg) {
          return UIUtils.alert.confirm(msg);
        })
        .then(function (confirm) {
          if (!confirm) return;

          // FIXME: should not change settings, but only tha BMA content
          // in UI, display data form BMA object
          csSettings.data.node = fallbackNode;

          csSettings.data.node.temporary = true;
          csHttp.cache.clear();

          // loop
          return BMA.copy(fallbackNode)
            .then(checkBmaNodeAlive);
        });
    }

    function isStarted() {
      return started;
    }

    function addListeners() {
      listeners = [
        // Listen if node changed
        BMA.api.node.on.restart($rootScope, restart, this)
      ];
    }

    function removeListeners() {
      _.forEach(listeners, function(remove){
        remove();
      });
      listeners = [];
    }

    function ready() {
      if (started) return $q.when();
      return startPromise || start();
    }

    function restart() {
      console.debug('[platform] restarting csPlatform');
      return stop()
        .then(function () {
          return $timeout(start, 200);
        });
    }

    function start() {

      // Avoid change state
      disableChangeState();

      // We use 'ionicReady()' instead of '$ionicPlatform.ready()', because this one is callable many times
      startPromise = ionicReady()

        .then($q.all([
          // Load device
          Device.ready(),

          // Start settings
          csSettings.ready()
        ]))

        // Load BMA
        .then(function(){
          return BMA.ready().then(checkBmaNodeAlive);
        })

        // Load currency
        .then(csCurrency.ready)

        // Trying to restore wallet
        .then(csWallet.ready)

        .then(function(){
          enableChangeState();
          addListeners();
          startPromise = null;
          started = true;
        })
        .catch(function(err) {
          startPromise = null;
          started = false;
          if($state.current.name !== 'app.home') {
            $state.go('app.home', {error: 'peer'});
          }
          throw err;
        });

      return startPromise;
    }

    function stop() {
      if (!started) return $q.when();
      removeListeners();

      csWallet.stop();
      csCurrency.stop();
      BMA.stop();

      return $timeout(function() {
        enableChangeState();
        started = false;
        startPromise = null;
      }, 500);
    }

    return  {
      disableChangeState: disableChangeState,
      isStarted: isStarted,
      ready: ready,
      restart: restart,
      start: start,
      stop: stop
    };
  })

  .run(function($rootScope, $translate, $state, $window, $urlRouter, ionicReady,
                Device, UIUtils, $ionicConfig, PluginService, csPlatform, csWallet, csSettings, csConfig, csCurrency) {
    'ngInject';

    // Allow access to service data, from HTML templates
    $rootScope.config = csConfig;
    $rootScope.settings = csSettings.data;
    $rootScope.currency = csCurrency.data;
    $rootScope.device = Device;

    // Compute the root path
    var hashIndex = $window.location.href.indexOf('#');
    $rootScope.rootPath = (hashIndex != -1) ? $window.location.href.substr(0, hashIndex) : $window.location.href;
    console.debug('[app] Root path is [' + $rootScope.rootPath + ']');

    // removeIf(device)
    // -- Automatic redirection to HTTPS
    if ((csConfig.httpsMode === true || csConfig.httpsMode == 'true' ||csConfig.httpsMode === 'force') &&
      $window.location.protocol != 'https:') {
      $rootScope.$on('$stateChangeStart', function (event, next, nextParams, fromState) {
        var path = 'https' + $rootScope.rootPath.substr(4) + $state.href(next, nextParams);
        if (csConfig.httpsModeDebug) {
          console.debug('[app] [httpsMode] --- Should redirect to: ' + path);
          // continue
        }
        else {
          $window.location.href = path;
        }
      });
    }
    // endRemoveIf(device)

    // We use 'ionicReady()' instead of '$ionicPlatform.ready()', because this one is callable many times
    ionicReady().then(function() {

      // Keyboard
      if (Device.keyboard.enable) {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        Device.keyboard.hideKeyboardAccessoryBar(true);

        // iOS: do not push header up when opening keyboard
        // (see http://ionicframework.com/docs/api/page/keyboard/)
        if (ionic.Platform.isIOS()) {
          Device.keyboard.disableScroll(true);
        }
      }

      // Ionic Platform Grade is not A, disabling views transitions
      if (ionic.Platform.grade.toLowerCase() != 'a') {
        console.info('[app] Disabling UI effects, because plateform\'s grade is [' + ionic.Platform.grade + ']');
        UIUtils.setEffects(false);
      }

      // Status bar style
      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }

      // Make sure platform is started
      return csPlatform.ready();
    });
  })
;

// Workaround to add "".startsWith() if not present
if (typeof String.prototype.startsWith !== 'function') {
  console.debug("Adding String.prototype.startsWith() -> was missing on this platform");
  String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0;
  };
}

// Workaround to add "".startsWith() if not present
if (typeof String.prototype.trim !== 'function') {
  console.debug("Adding String.prototype.trim() -> was missing on this platform");
  // Make sure we trim BOM and NBSP
  var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
  String.prototype.trim = function() {
    return this.replace(rtrim, '');
  };
}

// Workaround to add Math.trunc() if not present - fix #144
if (Math && typeof Math.trunc !== 'function') {
  console.debug("Adding Math.trunc() -> was missing on this platform");
  Math.trunc = function(number) {
    return (number - 0.5).toFixed();
  };
}

// Workaround to add "".format() if not present
if (typeof String.prototype.format !== 'function') {
  console.debug("Adding String.prototype.format() -> was missing on this platform");
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined' ? args[number] : match;
    });
  };
}
