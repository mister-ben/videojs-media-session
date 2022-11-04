import videojs from 'video.js';
import window from 'global/window';
import {version as VERSION} from '../package.json';

// Default options for the plugin.
const defaults = {};

const merge = videojs.obj ? videojs.obj.merge : videojs.mergeOptions;

const navigator = window.navigator;

const MEDIA_SESSION_EXISTS = Boolean(navigator.mediaSession);

const SKIP_TIME = 10;

const getType = (url) => {
  const ext = videojs.url.getFileExtension(url);

  if (ext === 'jpg') {
    return 'image/jpeg';
  }
  if (ext === 'svg') {
    return 'image/svg+xml';
  }
  return `image/${ext}`;
};

const updatePosition = (player) => {
  if ('positionState' in navigator.mediaSession) {
    const state = {
      duration: player.duration(),
      playbackRate: player.playbackRate(),
      position: player.currentTime()
    };

    navigator.mediaSession.setPositionState(state);
  }
};

const updateMediaSession = (player) => {
  let curSrc;

  if (player.usingPlugin('playlist')) {
    const playlist = player.playlist();

    curSrc = Object.assign({}, playlist[player.playlist.currentItem()]);
  } else {
    curSrc = Object.assign({}, player.getMedia());
  }

  curSrc.title = curSrc.name;

  if (!curSrc.artwork) {
    const poster = player.poster();

    if (curSrc.thumbnail) {
      curSrc.artwork = curSrc.thumbnail.map((thumb) => ({
        src: thumb.srcset || thumb.src,
        type: thumb.type || getType(thumb.src)
      }));
    } else if (poster) {
      curSrc.artwork = [{
        src: poster,
        type: getType(poster)
      }];
    }
  }

  curSrc.src = player.currentSrc();
  navigator.mediaSession.metadata = new window.MediaMetadata(curSrc);
  updatePosition();
};

const setUpControls = (player) => {

  const handlers = [
    ['play', () => {
      player.play();
    }],
    ['pause', () => {
      player.pause();
    }],
    ['stop', () => {
      player.pause();
    }],
    ['seekbackward', (d) => {
      player.currentTime(player.currentTime() - (d && d.skipOffset ? d.skipOffset : SKIP_TIME));
      updatePosition();
    }],
    ['seekforward', (d) => {
      player.currentTime(player.currentTime() + (d && d.skipOffset ? d.skipOffset : SKIP_TIME));
      updatePosition();
    }],
    ['seekto', (d) => {
      player.currentTime(d.seekTime);
      updatePosition();
    }]
  ];

  if (player.usingPlugin('playlist')) {
    handlers.push(['previoustrack', () => {
      player.playlist.previous();
    }]);
    handlers.push(['nexttrack', () => {
      player.playlist.next();
    }]);
  }

  for (const [action, handler] of handlers) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      videojs.log.debug(`Media session action ${action} cannot be set`);
    }
  }
};

/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 *           A Video.js player.
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const onPlayerReady = (player, options) => {
  if (!MEDIA_SESSION_EXISTS) {
    videojs.log.debug('Media Session is not available on this device.');
    return;
  }

  setUpControls(player);

  player.on('loadstart', () => updateMediaSession(player));

  updateMediaSession(player);

  player.addClass('vjs-media-session');

};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function mediaSession
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const mediaSession = function(options) {
  this.ready(() => {
    onPlayerReady(this, merge(defaults, options));
  });
};

// Register the plugin with video.js.
videojs.registerPlugin('mediaSession', mediaSession);

// Include the version number.
mediaSession.VERSION = VERSION;

export default mediaSession;
