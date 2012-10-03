﻿/// <reference path="lib/jquery-1.6.4.js" />
/// <reference path="Game.js" />
/// <reference path="lib/jquery.spritify-0.0.0.js" />

$(function () {
    // The hub name is a single letter in order to reduce payload size
    var env = $.connection.h,
        game,
        configurationManager,
        payloadDecompressor = new PayloadDecompressor(),
        latencyResolver = new LatencyResolver(env),
        gameInfoReceived = false,
        lastPayload = { Ships: {}, Bullets: [] };

    function Initialize(init) {
        configurationManager = new ConfigurationManager(init.Configuration);
        game = new Game(env, init.ShipID);
        payloadDecompressor.LoadContracts(init.CompressionContracts);
        $("#ShipName").val(init.ShipName);

        $("#ShipName").keyup(function (e) {
            if (e.keyCode == 13) {
                env.changeName($("#ShipName").val());
            }
        });

        $("#ChangeShipName").click(function () {
            env.changeName($("#ShipName").val());
        });

        shortcut.add("X", function () {
            game.ShipManager.DrawName = !game.ShipManager.DrawName;
        }, { 'disable_in_input': true, 'type': 'keyup' });

        latencyResolver.Resolve(LatencyResolvingComplete);
    }

    function LatencyResolvingComplete() {        
        StartUpdateLoop();
        env.readyForPayloads();        
    }

    function StartUpdateLoop() {
        window.requestAnimFrame = (function () {
            return window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame ||
                    function (callback) {
                        window.setTimeout(callback, configurationManager.gameConfig.UPDATE_INTERVAL);
                    };
        })();

        (function animloop() {
            requestAnimFrame(animloop);

            if (gameInfoReceived) {
                game.Update(lastPayload);
            }
        })();
    }

    function LoadMapInfo(info) {
        lastPayload = info;
        gameInfoReceived = true;

        if (info.MovementReceivedAt) {
            game.ShipManager.MyShip.acknowledgeMovement(info.MovementReceivedAt);
        }

        game.ShipManager.UpdateShips(info.Ships);
        game.BulletManager.UpdateBullets(info.Bullets);
    }

    // Small name in order to minimize payload
    env.d = function (compressedPayload) {
        LoadMapInfo(payloadDecompressor.Decompress(compressedPayload));
    }

    $.connection.hub.start(function () {
        env.initializeClient().done(function (value) {
            Initialize(value);
        });
    });
});
