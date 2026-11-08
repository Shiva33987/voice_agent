const fs = require('fs');
const vm = require('vm');

const clientPagePath = '/app/.next/static/chunks/app/recordings/page-26a4f51e7eab33a5.js';
const serverPagePath = '/app/.next/server/app/recordings/page.js';

let clientCode = fs.readFileSync(clientPagePath, 'utf8');
let serverCode = fs.readFileSync(serverPagePath, 'utf8');

console.log('Client code length:', clientCode.length);
console.log('Server code length:', serverCode.length);

const callRecordingsComponentCode = `
function CallRecordingsList_Custom(props) {
  var refreshKey = props.refreshKey;
  var state = n.useState([]);
  var runs = state[0];
  var setRuns = state[1];

  var loadingState = n.useState(true);
  var isLoading = loadingState[0];
  var setIsLoading = loadingState[1];

  var searchState = n.useState('');
  var searchQuery = searchState[0];
  var setSearchQuery = searchState[1];

  var filterState = n.useState('audio-only');
  var activeFilter = filterState[0];
  var setActiveFilter = filterState[1];

  var playingState = n.useState(null);
  var playingId = playingState[0];
  var setPlayingId = playingState[1];

  var isAudioPlayingState = n.useState(false);
  var isAudioPlaying = isAudioPlayingState[0];
  var setIsAudioPlaying = isAudioPlayingState[1];

  var progressState = n.useState(0);
  var audioProgress = progressState[0];
  var setAudioProgress = progressState[1];

  var currTimeState = n.useState(0);
  var currentTime = currTimeState[0];
  var setCurrentTime = currTimeState[1];

  var durState = n.useState(0);
  var audioDuration = durState[0];
  var setAudioDuration = durState[1];

  var speedState = n.useState(1);
  var playbackSpeed = speedState[0];
  var setPlaybackSpeed = speedState[1];

  var loadingAudioState = n.useState(null);
  var audioLoadingId = loadingAudioState[0];
  var setAudioLoadingId = loadingAudioState[1];

  var transcriptModalState = n.useState(null);
  var transcriptModal = transcriptModalState[0];
  var setTranscriptModal = transcriptModalState[1];

  var transcriptContentState = n.useState(null);
  var transcriptContent = transcriptContentState[0];
  var setTranscriptContent = transcriptContentState[1];

  var transcriptLoadingState = n.useState(false);
  var isTranscriptLoading = transcriptLoadingState[0];
  var setIsTranscriptLoading = transcriptLoadingState[1];

  // Selection & Delete State
  var selectedState = n.useState([]);
  var selectedRunIds = selectedState[0];
  var setSelectedRunIds = selectedState[1];

  var deletingState = n.useState(false);
  var isDeleting = deletingState[0];
  var setIsDeleting = deletingState[1];

  var audioRef = n.useRef(null);

  var formatSecs = function(s) {
    if (!s || s <= 0) return '00:00';
    var m = Math.floor(s / 60);
    var rem = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (rem < 10 ? '0' : '') + rem;
  };

  var fetchCalls = n.useCallback(function() {
    setIsLoading(true);
    w.w0({ query: { limit: 100 } })
      .then(function(res) {
        if (res.data && res.data.runs) {
          setRuns(res.data.runs);
        }
      })
      .catch(function(err) {
        console.error('Failed to load call recordings:', err);
      })
      .finally(function() {
        setIsLoading(false);
      });
  }, []);

  n.useEffect(function() {
    fetchCalls();
  }, [fetchCalls, refreshKey]);

  var stopPlayback = n.useCallback(function() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setIsAudioPlaying(false);
    setAudioProgress(0);
    setCurrentTime(0);
  }, []);

  var handleTogglePlay = function(run) {
    if (playingId === run.id) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
          setIsAudioPlaying(true);
        } else {
          audioRef.current.pause();
          setIsAudioPlaying(false);
        }
      }
      return;
    }

    stopPlayback();
    setAudioLoadingId(run.id);

    var getUrlPromise;
    if (run.recording_url) {
      getUrlPromise = w.uGt({ query: { key: run.recording_url } }).then(function(res) {
        return res.data && res.data.url;
      });
    } else if (run.recording_public_url) {
      getUrlPromise = Promise.resolve(run.recording_public_url + '?inline=true');
    } else {
      getUrlPromise = Promise.resolve(null);
    }

    getUrlPromise
      .then(function(url) {
        if (!url) {
          alert('No audio recording found for this call.');
          setAudioLoadingId(null);
          return;
        }

        var audio = new Audio(url);
        audio.playbackRate = playbackSpeed;

        audio.onloadedmetadata = function() {
          setAudioDuration(audio.duration || run.call_duration_seconds || 0);
        };

        audio.ontimeupdate = function() {
          if (audio.duration) {
            setCurrentTime(audio.currentTime);
            setAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        };

        audio.onended = function() {
          stopPlayback();
        };

        audio.onerror = function() {
          alert('Failed to play audio.');
          stopPlayback();
        };

        audioRef.current = audio;
        setPlayingId(run.id);
        setIsAudioPlaying(true);
        setAudioLoadingId(null);
        return audio.play();
      })
      .catch(function(err) {
        console.error('Audio play error:', err);
        setAudioLoadingId(null);
        stopPlayback();
      });
  };

  var handleSeek = function(e) {
    var val = Number(e.target.value);
    if (audioRef.current && audioRef.current.duration) {
      var nextTime = (val / 100) * audioRef.current.duration;
      audioRef.current.currentTime = nextTime;
      setAudioProgress(val);
      setCurrentTime(nextTime);
    }
  };

  var handleCycleSpeed = function() {
    var speeds = [1, 1.25, 1.5, 2];
    var nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    var nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  var handleDownload = function(run) {
    var dlPromise;
    if (run.recording_url) {
      dlPromise = w.uGt({ query: { key: run.recording_url } }).then(function(r) { return r.data && r.data.url; });
    } else {
      dlPromise = Promise.resolve(run.recording_public_url);
    }
    dlPromise.then(function(url) {
      if (!url) {
        alert('Download URL not found');
        return;
      }
      var a = document.createElement('a');
      a.href = url;
      a.download = 'call-recording-' + run.id + '.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  var handleOpenTranscript = function(run) {
    setTranscriptModal(run);
    setIsTranscriptLoading(true);
    setTranscriptContent(null);

    var tPromise;
    if (run.transcript_url) {
      tPromise = w.uGt({ query: { key: run.transcript_url } })
        .then(function(res) { return res.data && res.data.url ? fetch(res.data.url).then(function(r) { return r.text(); }) : null; });
    } else if (run.transcript_public_url) {
      tPromise = fetch(run.transcript_public_url).then(function(r) { return r.text(); });
    } else {
      tPromise = Promise.resolve(null);
    }

    tPromise
      .then(function(text) {
        setTranscriptContent(text || 'No transcript available for this conversation.');
      })
      .catch(function() {
        setTranscriptContent('Failed to fetch transcript.');
      })
      .finally(function() {
        setIsTranscriptLoading(false);
      });
  };

  var getAuthHeaders = function() {
    var h = { 'Content-Type': 'application/json' };
    return fetch('/api/auth/oss')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (d && d.token) h['Authorization'] = 'Bearer ' + d.token;
        return h;
      })
      .catch(function() { return h; });
  };

  var handleDeleteSingle = function(runId, runName) {
    if (!confirm('Are you sure you want to permanently delete Call #' + runId + ' (' + (runName || 'Call Recording') + ')? This action cannot be undone.')) return;
    setIsDeleting(true);
    getAuthHeaders()
      .then(function(headers) {
        return fetch('/api/v1/organizations/usage/runs/' + runId, {
          method: 'DELETE',
          headers: headers
        });
      })
      .then(function(res) {
        if (!res.ok) {
          return res.json().catch(function() { return {}; }).then(function(d) {
            throw new Error(d.detail || 'Failed to delete call recording');
          });
        }
        setRuns(function(prev) { return prev.filter(function(r) { return r.id !== runId; }); });
        setSelectedRunIds(function(prev) { return prev.filter(function(id) { return id !== runId; }); });
        alert('Call #' + runId + ' deleted successfully.');
      })
      .catch(function(err) {
        alert('Error: ' + (err.message || 'Failed to delete call recording'));
      })
      .finally(function() {
        setIsDeleting(false);
      });
  };

  var handleDeleteSelected = function() {
    if (!selectedRunIds.length) return;
    if (!confirm('Are you sure you want to permanently delete ' + selectedRunIds.length + ' selected call recording(s)? This action cannot be undone.')) return;
    setIsDeleting(true);
    getAuthHeaders()
      .then(function(headers) {
        return fetch('/api/v1/organizations/usage/runs', {
          method: 'DELETE',
          headers: headers,
          body: JSON.stringify({ run_ids: selectedRunIds, delete_all: false })
        });
      })
      .then(function(res) {
        if (!res.ok) {
          return res.json().catch(function() { return {}; }).then(function(d) {
            throw new Error(d.detail || 'Failed to delete selected call recordings');
          });
        }
        var count = selectedRunIds.length;
        setRuns(function(prev) { return prev.filter(function(r) { return selectedRunIds.indexOf(r.id) === -1; }); });
        setSelectedRunIds([]);
        alert(count + ' call recording(s) deleted successfully.');
      })
      .catch(function(err) {
        alert('Error: ' + (err.message || 'Failed to delete call recordings'));
      })
      .finally(function() {
        setIsDeleting(false);
      });
  };

  var handleDeleteAll = function() {
    if (!runs.length) return;
    if (!confirm('WARNING: Are you sure you want to permanently delete ALL ' + runs.length + ' call recordings? This action CANNOT be undone and will permanently erase all calls and audio.')) return;
    var typed = prompt('Please type DELETE to confirm deleting all ' + runs.length + ' call recordings:');
    if (typed !== 'DELETE') {
      alert('Delete all cancelled.');
      return;
    }
    setIsDeleting(true);
    getAuthHeaders()
      .then(function(headers) {
        return fetch('/api/v1/organizations/usage/runs', {
          method: 'DELETE',
          headers: headers,
          body: JSON.stringify({ delete_all: true })
        });
      })
      .then(function(res) {
        if (!res.ok) {
          return res.json().catch(function() { return {}; }).then(function(d) {
            throw new Error(d.detail || 'Failed to delete all recordings');
          });
        }
        setRuns([]);
        setSelectedRunIds([]);
        alert('All call recordings have been permanently deleted.');
      })
      .catch(function(err) {
        alert('Error: ' + (err.message || 'Failed to delete recordings'));
      })
      .finally(function() {
        setIsDeleting(false);
      });
  };

  var handleToggleSelect = function(id) {
    setSelectedRunIds(function(prev) {
      var idx = prev.indexOf(id);
      if (idx !== -1) {
        return prev.filter(function(x) { return x !== id; });
      } else {
        return prev.concat([id]);
      }
    });
  };

  var filteredRuns = runs.filter(function(run) {
    var hasAudio = Boolean(run.recording_url || run.recording_public_url);
    if (activeFilter === 'audio-only' && !hasAudio) return false;
    if (activeFilter === 'inbound') {
      var isOut = run.call_type === 'outbound' || (run.workflow_name && run.workflow_name.toLowerCase().includes('outbound')) || (run.called_number && !run.caller_number);
      if (isOut) return false;
    }
    if (activeFilter === 'outbound') {
      var isOut = run.call_type === 'outbound' || (run.workflow_name && run.workflow_name.toLowerCase().includes('outbound')) || (run.called_number && !run.caller_number);
      if (!isOut) return false;
    }
    if (searchQuery.trim()) {
      var q = searchQuery.toLowerCase();
      var idMatch = String(run.id).includes(q);
      var nameMatch = (run.workflow_name || run.name || '').toLowerCase().includes(q);
      var callerMatch = (run.caller_number || '').toLowerCase().includes(q);
      var calledMatch = (run.called_number || '').toLowerCase().includes(q);
      return idMatch || nameMatch || callerMatch || calledMatch;
    }
    return true;
  });

  var handleSelectAllFiltered = function() {
    var filteredIds = filteredRuns.map(function(r) { return r.id; });
    var allSelected = filteredIds.length > 0 && filteredIds.every(function(id) { return selectedRunIds.indexOf(id) !== -1; });
    if (allSelected) {
      setSelectedRunIds(function(prev) {
        return prev.filter(function(id) { return filteredIds.indexOf(id) === -1; });
      });
    } else {
      setSelectedRunIds(function(prev) {
        var set = {};
        prev.forEach(function(id) { set[id] = true; });
        filteredIds.forEach(function(id) { set[id] = true; });
        return Object.keys(set).map(Number);
      });
    }
  };

  var totalWithAudio = runs.filter(function(r) { return r.recording_url || r.recording_public_url; }).length;
  var totalSeconds = runs.filter(function(r) { return r.recording_url || r.recording_public_url; }).reduce(function(a, b) { return a + (b.call_duration_seconds || 0); }, 0);
  var isAllFilteredSelected = filteredRuns.length > 0 && filteredRuns.every(function(r) { return selectedRunIds.indexOf(r.id) !== -1; });

  return (0, r.jsxs)('div', {
    className: 'space-y-6',
    children: [
      /* Top 3 Metric Cards with Glassmorphism */
      (0, r.jsxs)('div', {
        className: 'grid grid-cols-1 md:grid-cols-3 gap-4',
        children: [
          (0, r.jsxs)('div', {
            className: 'glass-card relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-lg',
            children: [
              (0, r.jsxs)('div', {
                className: 'flex items-center gap-3',
                children: [
                  (0, r.jsx)('div', {
                    className: 'h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500/25 to-purple-500/25 flex items-center justify-center text-indigo-400 border border-indigo-500/30 font-bold',
                    children: '🎙️'
                  }),
                  (0, r.jsxs)('div', {
                    children: [
                      (0, r.jsx)('p', { className: 'text-xs font-semibold uppercase tracking-wider text-slate-400', children: 'Recorded Phone Calls' }),
                      (0, r.jsx)('h3', { className: 'text-2xl font-bold text-white tracking-tight mt-0.5', children: totalWithAudio + ' Calls' })
                    ]
                  })
                ]
              }),
              (0, r.jsx)('p', { className: 'text-xs text-indigo-300/80 mt-3 font-medium', children: '✓ Stored in private MinIO storage' })
            ]
          }),
          (0, r.jsxs)('div', {
            className: 'glass-card relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-lg',
            children: [
              (0, r.jsxs)('div', {
                className: 'flex items-center gap-3',
                children: [
                  (0, r.jsx)('div', {
                    className: 'h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500/25 to-teal-500/25 flex items-center justify-center text-cyan-400 border border-cyan-500/30 font-bold',
                    children: '⏱️'
                  }),
                  (0, r.jsxs)('div', {
                    children: [
                      (0, r.jsx)('p', { className: 'text-xs font-semibold uppercase tracking-wider text-slate-400', children: 'Total Audio Recorded' }),
                      (0, r.jsx)('h3', { className: 'text-2xl font-bold text-white tracking-tight mt-0.5', children: formatSecs(totalSeconds) })
                    ]
                  })
                ]
              }),
              (0, r.jsx)('p', { className: 'text-xs text-cyan-300/80 mt-3 font-medium', children: '✓ High-fidelity voice conversations' })
            ]
          }),
          (0, r.jsxs)('div', {
            className: 'glass-card relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-lg',
            children: [
              (0, r.jsxs)('div', {
                className: 'flex items-center gap-3',
                children: [
                  (0, r.jsx)('div', {
                    className: 'h-10 w-10 rounded-xl bg-gradient-to-tr from-fuchsia-500/25 to-pink-500/25 flex items-center justify-center text-fuchsia-400 border border-fuchsia-500/30 font-bold',
                    children: '📞'
                  }),
                  (0, r.jsxs)('div', {
                    children: [
                      (0, r.jsx)('p', { className: 'text-xs font-semibold uppercase tracking-wider text-slate-400', children: 'Total Runs Tracked' }),
                      (0, r.jsx)('h3', { className: 'text-2xl font-bold text-white tracking-tight mt-0.5', children: runs.length + ' Total' })
                    ]
                  })
                ]
              }),
              (0, r.jsx)('p', { className: 'text-xs text-fuchsia-300/80 mt-3 font-medium', children: '✓ Auto-recorded inbound & outbound' })
            ]
          })
        ]
      }),

      /* Filter & Search Bar */
      (0, r.jsxs)('div', {
        className: 'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-md',
        children: [
          (0, r.jsx)('input', {
            type: 'text',
            placeholder: 'Search phone number, agent name, or call ID...',
            value: searchQuery,
            onChange: function(e) { setSearchQuery(e.target.value); },
            className: 'px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 flex-1'
          }),
          (0, r.jsxs)('div', {
            className: 'flex items-center gap-2 overflow-x-auto',
            children: [
              (0, r.jsx)('button', {
                onClick: function() { setActiveFilter('audio-only'); },
                className: 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ' +
                  (activeFilter === 'audio-only'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-400/40'
                    : 'text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10'),
                children: '🎵 With Audio (' + totalWithAudio + ')'
              }),
              (0, r.jsx)('button', {
                onClick: function() { setActiveFilter('all'); },
                className: 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ' +
                  (activeFilter === 'all'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-400/40'
                    : 'text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10'),
                children: 'All Calls (' + runs.length + ')'
              }),
              (0, r.jsx)('button', {
                onClick: function() { setActiveFilter('inbound'); },
                className: 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ' +
                  (activeFilter === 'inbound'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30 border border-teal-400/40'
                    : 'text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10'),
                children: '📥 Inbound'
              }),
              (0, r.jsx)('button', {
                onClick: function() { setActiveFilter('outbound'); },
                className: 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ' +
                  (activeFilter === 'outbound'
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md shadow-purple-500/30 border border-violet-400/40'
                    : 'text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10'),
                children: '📤 Outbound'
              }),
              (0, r.jsx)('button', {
                onClick: fetchCalls,
                className: 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition-all cursor-pointer',
                title: 'Refresh list',
                children: '🔄'
              })
            ]
          })
        ]
      }),

      /* Bulk Actions Bar (Select All / Delete Selected / Delete All) */
      (0, r.jsxs)('div', {
        className: 'flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.035] border border-white/10 backdrop-blur-xl shadow-sm',
        children: [
          (0, r.jsxs)('div', {
            className: 'flex items-center gap-3',
            children: [
              (0, r.jsxs)('label', {
                className: 'flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-200 hover:text-white',
                children: [
                  (0, r.jsx)('input', {
                    type: 'checkbox',
                    checked: isAllFilteredSelected,
                    onChange: handleSelectAllFiltered,
                    className: 'w-4 h-4 rounded border-white/20 bg-white/10 text-rose-500 focus:ring-rose-500/30 cursor-pointer accent-rose-500'
                  }),
                  'Select All (' + filteredRuns.length + ')'
                ]
              }),
              selectedRunIds.length > 0 && (0, r.jsx)('span', {
                className: 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30',
                children: selectedRunIds.length + ' selected'
              })
            ]
          }),
          (0, r.jsxs)('div', {
            className: 'flex items-center gap-2',
            children: [
              (0, r.jsxs)('button', {
                onClick: handleDeleteSelected,
                disabled: selectedRunIds.length === 0 || isDeleting,
                className: 'px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ' +
                  (selectedRunIds.length > 0 && !isDeleting
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-600/30 border border-rose-400/40 cursor-pointer'
                    : 'bg-white/[0.04] text-slate-500 border border-white/5 cursor-not-allowed opacity-50'),
                children: [
                  '🗑️ Delete Selected' + (selectedRunIds.length ? ' (' + selectedRunIds.length + ')' : '')
                ]
              }),
              (0, r.jsxs)('button', {
                onClick: handleDeleteAll,
                disabled: runs.length === 0 || isDeleting,
                className: 'px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 border border-rose-500/30 transition-all cursor-pointer',
                title: 'Permanently delete all call recordings in organization',
                children: [
                  '⚠️ Delete All (' + runs.length + ')'
                ]
              })
            ]
          })
        ]
      }),

      /* Call Cards List */
      isLoading
        ? (0, r.jsx)('div', {
            className: 'text-center py-12 text-slate-400 font-medium',
            children: 'Loading call recordings...'
          })
        : filteredRuns.length === 0
        ? (0, r.jsxs)('div', {
            className: 'text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl',
            children: [
              (0, r.jsx)('div', { className: 'text-4xl mb-3', children: '🎧' }),
              (0, r.jsx)('h3', { className: 'text-lg font-bold text-white', children: 'No Call Recordings Found' }),
              (0, r.jsx)('p', { className: 'text-sm text-slate-400 mt-1 max-w-md mx-auto', children: 'Recordings appear automatically whenever your voice agents complete an inbound or outbound call.' })
            ]
          })
        : (0, r.jsx)('div', {
            className: 'space-y-4',
            children: filteredRuns.map(function(run) {
              var hasAudio = Boolean(run.recording_url || run.recording_public_url);
              var isPlaying = playingId === run.id;
              var isLoadingThis = audioLoadingId === run.id;
              var isOut = run.call_type === 'outbound' || (run.workflow_name && run.workflow_name.toLowerCase().includes('outbound')) || (run.called_number && !run.caller_number);
              var isSelected = selectedRunIds.indexOf(run.id) !== -1;

              return (0, r.jsxs)('div', {
                key: run.id,
                className: 'rounded-2xl p-5 border transition-all duration-300 backdrop-blur-xl ' +
                  (isSelected
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-900/10'
                    : isPlaying
                    ? 'bg-gradient-to-r from-indigo-950/50 via-purple-950/40 to-indigo-950/50 border-indigo-400/60 shadow-xl shadow-indigo-500/20'
                    : 'bg-white/[0.035] hover:bg-white/[0.05] border-white/10 hover:border-white/20 shadow-lg'),
                children: [
                  /* Header */
                  (0, r.jsxs)('div', {
                    className: 'flex flex-wrap items-start justify-between gap-3 mb-3',
                    children: [
                      (0, r.jsxs)('div', {
                        className: 'flex items-start gap-3 flex-1',
                        children: [
                          /* Checkbox */
                          (0, r.jsx)('input', {
                            type: 'checkbox',
                            checked: isSelected,
                            onChange: function() { handleToggleSelect(run.id); },
                            className: 'w-4 h-4 rounded border-white/20 bg-white/10 text-rose-500 focus:ring-rose-500/30 cursor-pointer accent-rose-500 mt-1 flex-shrink-0'
                          }),
                          (0, r.jsxs)('div', {
                            className: 'space-y-1 flex-1',
                            children: [
                              (0, r.jsxs)('div', {
                                className: 'flex items-center gap-2 flex-wrap',
                                children: [
                                  (0, r.jsx)('span', {
                                    className: 'px-2.5 py-0.5 rounded-full text-xs font-semibold border ' +
                                      (isOut
                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                        : 'bg-teal-500/20 text-teal-300 border-teal-500/30'),
                                    children: isOut ? '↗ Outbound Call' : '↙ Inbound Call'
                                  }),
                                  (0, r.jsx)('span', {
                                    className: 'text-xs font-mono text-slate-400',
                                    children: 'Call #' + run.id
                                  }),
                                  hasAudio && (0, r.jsx)('span', {
                                    className: 'px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                                    children: '● Audio Ready'
                                  })
                                ]
                              }),
                              (0, r.jsx)('h4', {
                                className: 'text-base font-bold text-white tracking-tight',
                                children: run.workflow_name || run.name || 'Voice AI Agent'
                              }),
                              (0, r.jsxs)('div', {
                                className: 'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5',
                                children: [
                                  (run.caller_number || run.called_number) && (0, r.jsxs)('span', {
                                    className: 'text-indigo-300 font-medium',
                                    children: [
                                      '📞 ' + (run.caller_number || 'Caller'),
                                      ' → ',
                                      (run.called_number || 'Agent')
                                    ]
                                  }),
                                  (0, r.jsx)('span', {
                                    className: 'text-slate-400',
                                    children: '🕒 ' + (run.created_at ? new Date(run.created_at).toLocaleString() : '')
                                  }),
                                  (0, r.jsx)('span', {
                                    className: 'text-slate-300 font-medium',
                                    children: 'Duration: ' + formatSecs(run.call_duration_seconds)
                                  })
                                ]
                              })
                            ]
                          })
                        ]
                      }),
                      /* Action Buttons */
                      (0, r.jsxs)('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          (run.transcript_url || run.transcript_public_url) && (0, r.jsx)('button', {
                            onClick: function() { handleOpenTranscript(run); },
                            className: 'px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-200 transition-colors cursor-pointer',
                            children: '📄 View Transcript'
                          }),
                          hasAudio && (0, r.jsx)('button', {
                            onClick: function() { handleDownload(run); },
                            className: 'px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-cyan-300 transition-colors cursor-pointer',
                            children: '⬇️ Download WAV'
                          }),
                          (0, r.jsx)('button', {
                            onClick: function() { handleDeleteSingle(run.id, run.workflow_name || run.name); },
                            disabled: isDeleting,
                            className: 'px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer',
                            title: 'Delete this recording',
                            children: '🗑️ Delete'
                          })
                        ]
                      })
                    ]
                  }),

                  /* Audio Player Bar */
                  hasAudio
                    ? (0, r.jsxs)('div', {
                        className: 'mt-3 p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center gap-3',
                        children: [
                          /* Play / Pause Button */
                          (0, r.jsx)('button', {
                            onClick: function() { handleTogglePlay(run); },
                            disabled: isLoadingThis,
                            className: 'h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/30 border border-indigo-400/40 flex-shrink-0 transition-transform active:scale-95 cursor-pointer',
                            children: isLoadingThis ? '⏳' : isPlaying && isAudioPlaying ? '⏸️' : '▶️'
                          }),

                          /* Progress Bar & Timestamps */
                          (0, r.jsxs)('div', {
                            className: 'flex-1 w-full space-y-1',
                            children: [
                              (0, r.jsx)('input', {
                                type: 'range',
                                min: '0',
                                max: '100',
                                value: isPlaying ? audioProgress : 0,
                                onChange: handleSeek,
                                disabled: !isPlaying,
                                className: 'w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none'
                              }),
                              (0, r.jsxs)('div', {
                                className: 'flex justify-between text-[11px] text-slate-400 font-mono',
                                children: [
                                  (0, r.jsx)('span', { children: isPlaying ? formatSecs(currentTime) : '00:00' }),
                                  (0, r.jsx)('span', { children: isPlaying ? formatSecs(audioDuration) : formatSecs(run.call_duration_seconds) })
                                ]
                              })
                            ]
                          }),

                          /* Speed Button */
                          (0, r.jsx)('button', {
                            onClick: handleCycleSpeed,
                            className: 'px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-slate-300 font-mono border border-white/10 flex-shrink-0 cursor-pointer',
                            title: 'Playback Speed',
                            children: playbackSpeed + 'x'
                          })
                        ]
                      })
                    : null
                ]
              });
            })
          }),

      /* Transcript Modal */
      transcriptModal && (0, r.jsx)('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md',
        children: (0, r.jsxs)('div', {
          className: 'w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl bg-slate-950 border border-white/15 shadow-2xl p-6',
          children: [
            (0, r.jsxs)('div', {
              className: 'flex items-center justify-between pb-4 border-b border-white/10 mb-4',
              children: [
                (0, r.jsxs)('div', {
                  children: [
                    (0, r.jsx)('h3', { className: 'text-lg font-bold text-white', children: 'Call Transcript' }),
                    (0, r.jsx)('p', { className: 'text-xs text-slate-400 mt-0.5', children: 'Call #' + transcriptModal.id + ' • ' + (transcriptModal.workflow_name || transcriptModal.name || 'Agent') })
                  ]
                }),
                (0, r.jsx)('button', {
                  onClick: function() { setTranscriptModal(null); },
                  className: 'h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer',
                  children: '✕'
                })
              ]
            }),
            (0, r.jsx)('div', {
              className: 'flex-1 overflow-y-auto p-4 rounded-2xl bg-black/40 border border-white/10 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap',
              children: isTranscriptLoading ? 'Loading transcript...' : (transcriptContent || 'No transcript text available.')
            })
          ]
        })
      })
    ]
  });
}
`;

// Insert or Replace CallRecordingsList_Custom
if (clientCode.includes('function CallRecordingsList_Custom(props)')) {
  const startIdx = clientCode.indexOf('function CallRecordingsList_Custom(props)');
  const endIdx = clientCode.indexOf('function _(e){', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    clientCode = clientCode.substring(0, startIdx) + callRecordingsComponentCode.trim() + '\n' + clientCode.substring(endIdx);
    console.log('Successfully replaced existing CallRecordingsList_Custom with Delete feature!');
  } else {
    console.error('Could not locate bounds for existing CallRecordingsList_Custom');
  }
} else {
  const defMarker = 'function _(e){';
  clientCode = clientCode.replace(defMarker, callRecordingsComponentCode + '\n' + defMarker);
  console.log('Inserted CallRecordingsList_Custom with Delete feature!');
}

// Validate syntax
try {
  new vm.Script(clientCode);
  fs.writeFileSync(clientPagePath, clientCode, 'utf8');
  console.log('[SUCCESS] Successfully validated and saved patched client chunk!');
} catch (e) {
  console.error('[ERROR] JS syntax error in patched client chunk:', e.message);
  process.exit(1);
}

console.log('Patch complete.');
