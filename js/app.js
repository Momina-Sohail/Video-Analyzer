// Aura Video Analyzer — JavaScript Controller
document.addEventListener("DOMContentLoaded", () => {
  // Navigation Dropdown Handler (Mobile)
  const navDropdowns = document.querySelectorAll(".nav-dropdown");
  navDropdowns.forEach(dropdown => {
    dropdown.addEventListener("click", (e) => {
      const content = dropdown.querySelector(".nav-dropdown-content");
      if (content) {
        content.classList.toggle("show");
      }
    });
  });

  // Check if we are on the dashboard page
  const dashboardContainer = document.getElementById("dashboard-page-container");
  if (dashboardContainer) {
    initDashboardSimulator();
  }

  // Check if we are on the home page with the quick analyzer console
  const quickConsole = document.getElementById("quick-analyzer-console");
  if (quickConsole) {
    initQuickConsole();
  }
});

// Quick Console on the Home Page
function initQuickConsole() {
  const tabs = document.querySelectorAll(".console-tab");
  const inputPanel = document.getElementById("console-input-panel");
  const uploadPanel = document.getElementById("console-upload-panel");
  const analyzeBtn = document.getElementById("quick-analyze-btn");
  const urlInput = document.getElementById("quick-url-input");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      if (tab.dataset.tab === "url") {
        inputPanel.style.display = "flex";
        uploadPanel.style.display = "none";
      } else {
        inputPanel.style.display = "none";
        uploadPanel.style.display = "block";
      }
    });
  });

  analyzeBtn.addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (url) {
      // Redirect to dashboard with query parameters to auto-start simulation
      window.location.href = `dashboard.html?start=true&url=${encodeURIComponent(url)}`;
    } else {
      alert("Please paste a video URL first.");
    }
  });

  // Allow press Enter to submit
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      analyzeBtn.click();
    }
  });
}

// Full Dashboard Pipeline Simulator
function initDashboardSimulator() {
  const inputSection = document.getElementById("simulator-input-section");
  const activeSection = document.getElementById("simulator-active-section");
  const resultsSection = document.getElementById("simulator-results-section");
  
  const submitUrlBtn = document.getElementById("dashboard-submit-url");
  const dashboardUrlInput = document.getElementById("dashboard-url-input");
  const dragArea = document.getElementById("dashboard-drag-area");

  const terminal = document.getElementById("sim-terminal");
  const progressFill = document.getElementById("sim-progress-fill");
  const stageHeader = document.getElementById("sim-stage-header");
  const stageSub = document.getElementById("sim-stage-sub");

  // Mock transcript data that can be searched
  const mockTranscript = [
    { start: 0, timeStr: "00:00", text: "Welcome to this complete walkthrough of building serverless automation agents." },
    { start: 12, timeStr: "00:12", text: "Today we will construct a queue-driven architecture utilizing a Node background worker." },
    { start: 30, timeStr: "00:30", text: "First, we initialize the Turborepo monorepo and define our prisma schema package." },
    { start: 52, timeStr: "00:52", text: "Now we build the audio extraction pipeline using FFmpeg in the background worker." },
    { start: 78, timeStr: "01:18", text: "Wait, we notice Groq Whisper API triggers a rate limit or 429 exception on heavy files." },
    { start: 95, timeStr: "01:35", text: "This triggers the automatic fallback logic, engaging the Gemini audio and video understanding module instantly." },
    { start: 120, timeStr: "02:00", text: "The failover is complete. The system compiles the transcript and forwards it to Llama 3 for structured extraction." },
    { start: 148, timeStr: "02:28", text: "We successfully extract the summaries, key moments, and step-by-step guidelines." },
    { start: 172, timeStr: "02:52", text: "Finally, we notify the Next.js web application via signed webhook to update the dashboard live." },
    { start: 198, timeStr: "03:18", text: "Thanks for watching! Make sure to sign up for Aura Video Analyzer to automate your workflow." }
  ];

  // Steps
  const mockSteps = [
    { order: 1, title: "Initialize Monorepo Structure", desc: "Set up the Turborepo schema, wire up Prisma database connections, and create workspace definitions.", time: "00:30", secs: 30 },
    { order: 2, title: "Configure FFmpeg Audio Down-sampling", desc: "Build the worker subprocess that extracts audio track as compressed mono MP3 for high-throughput transcription.", time: "00:52", secs: 52 },
    { order: 3, title: "Groq Whisper Transcription Integration", desc: "Establish direct client request connections to Groq's whisper-large-v3 model for sub-second text conversion.", time: "01:18", secs: 78 },
    { order: 4, title: "Automatic Gemini Failover Handler", desc: "Implement catch blocks that automatically redirect payload to Gemini's multimodal API if Groq fails or rate limits.", time: "01:35", secs: 95 },
    { order: 5, title: "Structure Extraction and Webhook Notification", desc: "Format structured JSON schemas using LLM summaries, post to Postgres, and dispatch authenticated webhooks.", time: "02:52", secs: 172 }
  ];

  // Check URL parameters to see if simulation should start immediately
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("start") === "true") {
    const videoUrl = urlParams.get("url") || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    startPipelineSimulation(videoUrl);
  }

  submitUrlBtn.addEventListener("click", () => {
    const url = dashboardUrlInput.value.trim();
    if (url) {
      startPipelineSimulation(url);
    } else {
      alert("Please enter a valid URL.");
    }
  });

  dashboardUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      submitUrlBtn.click();
    }
  });

  dragArea.addEventListener("click", () => {
    startPipelineSimulation("uploaded_video_presentation.mp4");
  });

  function addTerminalLine(text, type = "info") {
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function startPipelineSimulation(source) {
    // Hide input, show active simulator
    inputSection.style.display = "none";
    activeSection.style.display = "flex";
    resultsSection.style.display = "none";

    terminal.innerHTML = "";
    progressFill.style.width = "0%";
    
    addTerminalLine(`Initiating analysis pipeline for source: ${source}`, "info");

    const stages = [
      {
        progress: 15,
        header: "Ingesting Video Source",
        sub: "Fetching video metadata and streaming source chunks...",
        action: () => {
          addTerminalLine("Resolving metadata from source stream...", "info");
          addTerminalLine("Title: Serverless Agentic Workflows Architecture Walkthrough", "success");
          addTerminalLine("Duration: 03:30 | Format: MPEG-4", "success");
          addTerminalLine("Saving video source reference in Postgres as VideoJob(id: 'job_88a2c')...", "success");
        },
        delay: 1500
      },
      {
        progress: 35,
        header: "Extracting Audio (FFmpeg)",
        sub: "Down-sampling audio track to mono MP3...",
        action: () => {
          addTerminalLine("Running FFmpeg: ffmpeg -i input.mp4 -vn -acodec libmp3lame -q:a 4 output.mp3", "info");
          addTerminalLine("Audio extraction complete. Compressed mono MP3 size: 1.4 MB (reduced from 42 MB video file).", "success");
        },
        delay: 2000
      },
      {
        progress: 60,
        header: "Transcribing Audio Track (Groq)",
        sub: "Directing audio to Whisper-large-v3 on Groq...",
        action: () => {
          addTerminalLine("Attempting Groq Whisper-large-v3 connection...", "info");
          addTerminalLine("[Warning] Groq API returned 429: Rate Limit Exceeded (Whisper-large-v3 capacity hit).", "warning");
          addTerminalLine("Engaging secondary provider fallback sequence...", "warning");
          addTerminalLine("Redirecting audio payload to Gemini Multimodal Audio Model...", "info");
        },
        delay: 2500
      },
      {
        progress: 80,
        header: "Engaging Gemini Fallback",
        sub: "Multimodal audio/video translation active...",
        action: () => {
          addTerminalLine("Connected to Gemini API. Audio translation stream initialized.", "success");
          addTerminalLine("Raw transcription complete (Provider: Gemini). Character count: 12,450.", "success");
          addTerminalLine("Running LLM Summarization: formatting structured JSON output...", "info");
        },
        delay: 2000
      },
      {
        progress: 100,
        header: "Saving and Structuring Context",
        sub: "Writing results to Neon Postgres database...",
        action: () => {
          addTerminalLine("Prisma client: inserting Transcript(job_id: 'job_88a2c', raw_text) completed.", "success");
          addTerminalLine("Prisma client: inserting Summary(job_id: 'job_88a2c', steps, topics) completed.", "success");
          addTerminalLine("Sending POST request to Next.js webhook endpoint with job_id payload...", "info");
          addTerminalLine("Webhook verification succeeded! HTTP/1.1 200 OK.", "success");
          addTerminalLine("Pipeline execution finalized. Redirecting to Bento Board.", "success");
        },
        delay: 2000
      }
    ];

    let currentStage = 0;

    function runStage() {
      if (currentStage < stages.length) {
        const stage = stages[currentStage];
        stageHeader.textContent = stage.header;
        stageSub.textContent = stage.sub;
        progressFill.style.width = `${stage.progress}%`;
        stage.action();

        currentStage++;
        setTimeout(runStage, stage.delay);
      } else {
        // Load results
        loadBentoDashboard();
      }
    }

    runStage();
  }

  function loadBentoDashboard() {
    activeSection.style.display = "none";
    resultsSection.style.display = "block";

    // Setup interactive video player controls
    const video = document.getElementById("bento-video");
    const transcriptListContainer = document.getElementById("bento-transcript-list");
    const stepListContainer = document.getElementById("bento-step-list");
    const searchInput = document.getElementById("transcript-search");

    // Populate transcript
    renderTranscript(mockTranscript);

    // Populate steps
    renderSteps(mockSteps);

    // Filter Transcript
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      if (!query) {
        renderTranscript(mockTranscript);
        return;
      }
      const filtered = mockTranscript.map(segment => {
        if (segment.text.toLowerCase().includes(query)) {
          const highlightedText = segment.text.replace(
            new RegExp(`(${escapeRegExp(query)})`, "gi"),
            "<mark>$1</mark>"
          );
          return { ...segment, highlightedText };
        }
        return null;
      }).filter(Boolean);
      
      renderTranscript(filtered, true);
    });

    // Handle clicking timestamps
    document.addEventListener("click", (e) => {
      const segmentEl = e.target.closest(".transcript-segment");
      const stepItemEl = e.target.closest(".step-item");
      const momentTagEl = e.target.closest(".moment-tag");
      
      let seekSeconds = null;

      if (segmentEl) {
        seekSeconds = parseInt(segmentEl.dataset.time, 10);
      } else if (stepItemEl) {
        seekSeconds = parseInt(stepItemEl.dataset.time, 10);
      } else if (momentTagEl) {
        seekSeconds = parseInt(momentTagEl.dataset.time, 10);
      }

      if (seekSeconds !== null && video) {
        video.currentTime = seekSeconds;
        video.play();
        
        // Highlight active segment
        document.querySelectorAll(".transcript-segment").forEach(s => s.classList.remove("active-segment"));
        if (segmentEl) {
          segmentEl.classList.add("active-segment");
        }
      }
    });

    // Helper helper
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function renderTranscript(items, hasHighlights = false) {
      transcriptListContainer.innerHTML = "";
      if (items.length === 0) {
        transcriptListContainer.innerHTML = `<div style="color:var(--text-secondary);font-size:14px;padding:20px 0;">No matching segments found.</div>`;
        return;
      }
      items.forEach(item => {
        const seg = document.createElement("div");
        seg.className = "transcript-segment";
        seg.dataset.time = item.start;
        seg.innerHTML = `
          <span class="transcript-timestamp">${item.timeStr}</span>
          <span class="transcript-text">${hasHighlights ? item.highlightedText : item.text}</span>
        `;
        transcriptListContainer.appendChild(seg);
      });
    }

    function renderSteps(steps) {
      stepListContainer.innerHTML = "";
      steps.forEach(step => {
        const item = document.createElement("div");
        item.className = "step-item";
        item.dataset.time = step.secs;
        item.style.cursor = "pointer";
        item.innerHTML = `
          <div class="step-number">${step.order}</div>
          <div class="step-details">
            <h4>${step.title} <span class="step-badge">${step.time}</span></h4>
            <p>${step.desc}</p>
          </div>
        `;
        stepListContainer.appendChild(item);
      });
    }
  }
}
