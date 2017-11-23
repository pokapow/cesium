/******
* !! WARNING: This is a generated file !!
*
* PLEASE DO NOT MODIFY DIRECTLY
*
* => Changes should be done on file 'app/config.json'.
******/

angular.module("cesium.config", [])

.constant("csConfig", {
	"cacheTimeMs": 300000,
	"fallbackLanguage": "fr-FR",
	"defaultLanguage": "fr-FR",
	"rememberMe": true,
	"showUDHistory": true,
	"timeout": 300000,
	"timeWarningExpireMembership": 5184000,
	"timeWarningExpire": 7776000,
	"useLocalStorage": true,
	"useRelative": true,
	"expertMode": true,
	"decimalCount": 2,
	"helptip": {
		"enable": false,
		"installDocUrl": {
			"fr-FR": "https://duniter.org/fr/wiki/duniter/installer/",
			"en": "https://duniter.org/en/wiki/duniter/install/"
		}
	},
	"license": {
		"fr-FR": "license/license_g1-fr-FR",
		"en": "license/license_g1-en"
	},
	"node": {
		"host": "g1.duniter.fr",
		"port": 443
	},
	"fallbackNodes": [
		{
			"host": "g1.duniter.org",
			"port": "443"
		},
		{
			"host": "g1.duniter.fr",
			"port": "443"
		}
	],
	"plugins": {
		"es": {
			"enable": true,
			"askEnable": false,
			"host": "g1.data.duniter.fr",
			"port": 443,
			"wsPort": 443,
			"fallbackNodes": [
				{
					"host": "g1.data.le-sou.org",
					"port": "443"
				},
				{
					"host": "g1.data.duniter.fr",
					"port": "443"
				}
			],
			"notifications": {
				"txSent": true,
				"txReceived": true,
				"certSent": true,
				"certReceived": true
			},
			"defaultCountry": "France"
		},
		"graph": {
			"enable": true
		},
		"neo4j": {
			"enable": true
		},
		"rml9": {
			"enable": true
		}
	},
	"version": "1.0.0",
	"build": "2017-11-23T10:55:16.561Z",
	"newIssueUrl": "https://github.com/duniter/cesium/issues/new?labels=bug"
})

;