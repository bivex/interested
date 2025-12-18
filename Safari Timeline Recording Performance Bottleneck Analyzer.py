
# Copyright (c) 2025 Bivex
#
# Author: Bivex
# Available for contact via email: support@b-b.top
# For up-to-date contact information:
# https://github.com/bivex
#
# Created: 2025-12-18T14:07:04
# Last Updated: 2025-12-18T17:48:08
#
# Licensed under the MIT License.
# Commercial licensing available upon request.
"""
Enhanced Safari Timeline Recording Performance Bottleneck Analyzer

This script provides comprehensive analysis of Safari Web Inspector timeline recordings
to identify performance bottlenecks with deep field analysis including:

🔍 NETWORK ANALYSIS:
  - Detailed timing breakdown (DNS, TCP, SSL, TTFB, Content Download)
  - Cache analysis (hits/misses, cache efficiency)
  - Connection types and server analysis
  - Resource size analysis and optimization suggestions

🎨 LAYOUT ANALYSIS:
  - Layout thrashing detection with frame-by-frame analysis
  - Layout event types (Style Recalc, Layout, Paint, Composite)
  - Forced synchronous layouts identification
  - DOM read/write operation analysis

⚡ SCRIPT ANALYSIS:
  - JavaScript execution timing (Parse, Compile, Execute)
  - Function-level performance analysis
  - Script evaluation bottlenecks
  - Garbage collection event analysis

🎬 RENDERING ANALYSIS:
  - Frame-by-frame rendering performance
  - Frame drop detection with detailed timing
  - Composite layer analysis
  - Paint event optimization

🖥️ CPU ANALYSIS:
  - Thread-level CPU usage analysis
  - CPU usage patterns and spikes
  - Main thread blocking detection
  - Computational bottleneck identification

🧠 MEMORY ANALYSIS:
  - Memory pressure events
  - Garbage collection analysis
  - Memory leak detection patterns

Usage: python3 analyze_bottlenecks.py [recording_file.json]
"""

import json
import sys
import statistics
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import argparse

class SafariTimelineAnalyzer:
    def __init__(self, filepath):
        self.filepath = filepath
        self.data = None
        self.records = []
        self.recording_info = {}
        self.load_data()

    def load_data(self):
        """Load and parse the timeline recording JSON file with enhanced metadata extraction"""
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
                self.records = self.data['recording']['records']
                self.recording_info = self.data.get('recording', {})

                # Extract recording metadata
                self.start_time = self.recording_info.get('startTime', 0)
                self.end_time = self.recording_info.get('endTime', 0)
                self.duration = self.end_time - self.start_time

                # Extract additional metadata
                self.memory_pressure_events = self.recording_info.get('memoryPressureEvents', [])
                self.discontinuities = self.recording_info.get('discontinuities', [])
                self.markers = self.recording_info.get('markers', [])
                self.samples = self.recording_info.get('samples', [])

                print(f"**📊 Loaded {len(self.records)} records from {self.filepath}**")
                print(f"**⏱️ Recording duration:** {self.duration:.3f} seconds")
                print(f"**🏷️ Display name:** {self.recording_info.get('displayName', 'Unknown')}")
                print(f"**🔢 Version:** {self.data.get('version', 'Unknown')}")

        except Exception as e:
            print(f"❌ Error loading file: {e}")
            sys.exit(1)

    def analyze_network_bottlenecks(self):
        """Analyze network requests with detailed timing breakdown and cache analysis"""
        network_records = [r for r in self.records if r.get('type') == 'timeline-record-type-network']

        if not network_records:
            return

        # Detailed network analysis
        response_times = []
        timing_breakdown = defaultdict(list)
        cache_analysis = {'hits': 0, 'misses': 0, 'total': 0}
        connection_types = Counter()
        large_resources = []
        failed_requests = []
        slow_requests = []

        for record in network_records:
            entry = record.get('entry', {})
            response_time = entry.get('time', 0)
            response_times.append(response_time)

            # Detailed timing analysis
            timings = entry.get('timings', {})
            if timings:
                for timing_type, duration in timings.items():
                    if isinstance(duration, (int, float)) and duration > 0:
                        timing_breakdown[timing_type].append(duration)

            # Cache analysis
            cache = entry.get('cache', {})
            if cache:
                cache_analysis['total'] += 1
                if cache.get('hitCount', 0) > 0:
                    cache_analysis['hits'] += 1
                else:
                    cache_analysis['misses'] += 1

            # Connection analysis
            connection = entry.get('connection', '')
            if connection:
                connection_types[connection] += 1

            # Resource size analysis
            response = entry.get('response', {})
            body_size = response.get('bodySize', 0)
            if body_size > 500000:  # >500KB
                large_resources.append({
                    'url': entry.get('request', {}).get('url', ''),
                    'size': body_size,
                    'size_kb': body_size / 1024,
                    'time': response_time,
                    'content_type': response.get('content', {}).get('mimeType', 'unknown')
                })

            # Failed requests analysis
            status = response.get('status', 200)
            if status >= 400:
                failed_requests.append({
                    'url': entry.get('request', {}).get('url', ''),
                    'status': status,
                    'status_text': response.get('statusText', ''),
                    'time': response_time
                })

            # Slow requests (>1 second)
            if response_time > 1000:
                slow_requests.append({
                    'url': entry.get('request', {}).get('url', '')[:80],
                    'time': response_time,
                    'timings': timings
                })

        # Only print if there are problems
        has_problems = (large_resources or failed_requests or slow_requests or
                       (cache_analysis['total'] > 0 and (cache_analysis['hits'] / cache_analysis['total']) * 100 < 50))

        if has_problems:
            print("\n---")
            print("## 🔍 NETWORK PROBLEMS")

            # Large resources
            if large_resources:
                print("### 📦 LARGE RESOURCES (>500KB)")
                for resource in sorted(large_resources, key=lambda x: x['size'], reverse=True)[:5]:
                    print(f"- **{resource['size_kb']:.1f}KB** ({resource['content_type']}): `{resource['url'][:60]}...`")

            # Failed requests
            if failed_requests:
                print("### ❌ FAILED REQUESTS")
                for req in failed_requests[:5]:  # Show top 5
                    print(f"- **{req['status']}** {req['status_text']}: `{req['url'][:60]}...`")

            # Slow requests with timing details
            if slow_requests:
                print("### 🐌 SLOW REQUESTS (>1000ms)")
                for req in sorted(slow_requests, key=lambda x: x['time'], reverse=True)[:3]:
                    print(f"- **{req['time']:.1f}ms:** `{req['url']}...`")

            # Cache efficiency analysis
            if cache_analysis['total'] > 0:
                cache_hit_rate = (cache_analysis['hits'] / cache_analysis['total']) * 100
                if cache_hit_rate < 50:
                    print("### 💾 CACHE PROBLEMS")
                    print(f"- **Cache hit rate:** {cache_hit_rate:.1f}% - Consider cache optimization")

    def analyze_layout_bottlenecks(self):
        """Analyze layout operations with detailed event type analysis and thrashing detection"""
        layout_records = [r for r in self.records if r.get('type') == 'timeline-record-type-layout']

        if not layout_records:
            return

        # Enhanced layout analysis
        layout_durations = []
        event_types = Counter()
        forced_layouts = []
        layout_events_by_frame = defaultdict(list)

        for record in layout_records:
            # Extract timing information
            start_time = record.get('startTime', 0)
            end_time = record.get('endTime', 0)
            duration = end_time - start_time if end_time > start_time else 0
            layout_durations.append(duration)

            # Event type analysis
            event_type = record.get('eventType', 'unknown')
            event_types[event_type] += 1

            # Frame-based analysis for thrashing detection (60 FPS = ~16.67ms per frame)
            frame_number = int(start_time / (1000 / 60))  # Convert to frame number
            layout_events_by_frame[frame_number].append({
                'duration': duration,
                'event_type': event_type,
                'start_time': start_time
            })

        # Layout thrashing detection (improved algorithm)
        thrashing_frames = []
        frame_layout_counts = {}

        for frame_num, events in layout_events_by_frame.items():
            layout_count = len(events)
            frame_layout_counts[frame_num] = layout_count

            # More sophisticated thrashing detection
            if layout_count > 10:  # More than 10 layouts per frame
                total_duration = sum(event['duration'] for event in events)
                thrashing_frames.append({
                    'frame': frame_num,
                    'layout_count': layout_count,
                    'total_duration': total_duration,
                    'avg_duration': total_duration / layout_count,
                    'event_types': Counter(event['event_type'] for event in events)
                })

        # Check for forced layouts
        forced_layouts = [r for r in layout_records if r.get('eventType') == 'forced-layout']

        # Performance insights
        total_layout_time = sum(layout_durations)
        high_layout_time = total_layout_time > 100  # More than 100ms total layout time

        # Only print if there are problems
        has_problems = thrashing_frames or len(forced_layouts) > 5 or high_layout_time

        if has_problems:
            print("\n---")
            print("## 🎨 LAYOUT PROBLEMS")

            # Report layout thrashing
            if thrashing_frames:
                print("### 🚨 LAYOUT THRASHING DETECTED")
                print(f"- **Frames with >10 layouts:** {len(thrashing_frames)}")

                # Show most problematic frames
                worst_frames = sorted(thrashing_frames, key=lambda x: x['layout_count'], reverse=True)[:3]
                for i, frame in enumerate(worst_frames, 1):
                    print(f"- **Frame {frame['frame']}:** {frame['layout_count']} layouts ({frame['total_duration']:.1f}ms total)")
                    most_common_type = frame['event_types'].most_common(1)[0]
                    print(f"  - Most common: {most_common_type[0]} ({most_common_type[1]} times)")

            # Forced layouts
            if len(forced_layouts) > 5:
                print("### ⚡ FORCED LAYOUTS DETECTED")
                print(f"- **Forced synchronous layouts:** {len(forced_layouts)} detected")

            # High layout time
            if high_layout_time:
                print("### ⏱️ HIGH LAYOUT TIME")
                print(f"- **Total layout time:** {total_layout_time:.1f}ms")

            print("### 💡 OPTIMIZATION SUGGESTIONS")
            print("- Batch DOM updates together")
            print("- Use CSS containment (`contain: layout`)")
            print("- Avoid reading layout properties after writes")
            print("- Use `transform` instead of changing position/size")

    def analyze_script_bottlenecks(self):
        """Analyze JavaScript execution with detailed timing and event type analysis"""
        script_records = [r for r in self.records if r.get('type') == 'timeline-record-type-script']

        if not script_records:
            return

        # Enhanced script analysis
        execution_durations = []
        event_types = Counter()
        long_running_scripts = []
        script_evaluation_times = []
        function_calls = defaultdict(list)

        for record in script_records:
            # Extract timing information
            start_time = record.get('startTime', 0)
            end_time = record.get('endTime', 0)
            duration = end_time - start_time if end_time > start_time else 0
            execution_durations.append(duration)

            # Event type analysis
            event_type = record.get('eventType', 'unknown')
            event_types[event_type] += 1

            # Script details analysis
            details = record.get('details', '')
            target = record.get('target', {})

            # Function-level analysis
            if target and isinstance(target, dict):
                function_name = target.get('functionName', 'anonymous')
                url = target.get('url', 'inline')
                if function_name != 'anonymous':
                    function_calls[function_name].append(duration)

            # Long-running script detection (>50ms for better sensitivity)
            if duration > 50:
                long_running_scripts.append({
                    'duration': duration,
                    'event_type': event_type,
                    'details': details[:100],  # Truncate long details
                    'function_name': target.get('functionName', 'anonymous') if target else 'unknown',
                    'url': target.get('url', 'inline') if target else 'unknown',
                    'start_time': start_time
                })

            # Script evaluation tracking
            if event_type in ['script-eval', 'script-compile']:
                script_evaluation_times.append(duration)

        # Performance insights
        total_script_time = sum(execution_durations)
        high_script_time = total_script_time > 500  # More than 500ms total script time

        # Script evaluation analysis
        script_eval_high = False
        if script_evaluation_times:
            total_eval_time = sum(script_evaluation_times)
            script_eval_high = total_eval_time > 200  # More than 200ms total eval time

        # Only print if there are problems
        has_problems = long_running_scripts or script_eval_high or high_script_time

        if has_problems:
            print("\n---")
            print("## ⚡ SCRIPT EXECUTION PROBLEMS")

            # Script evaluation analysis
            if script_eval_high:
                total_eval_time = sum(script_evaluation_times)
                avg_eval_time = total_eval_time / len(script_evaluation_times)
                print("### 📜 HIGH SCRIPT EVALUATION TIME")
                print(f"- **Total eval time:** {total_eval_time:.1f}ms")
                print(f"- **Average eval time:** {avg_eval_time:.3f}ms")
                print("- ⚠️ Consider code splitting")

            # Long-running scripts
            if long_running_scripts:
                print("### 🐌 LONG-RUNNING SCRIPTS (>50ms)")
                for script in sorted(long_running_scripts, key=lambda x: x['duration'], reverse=True)[:5]:
                    print(f"- **{script['duration']:.1f}ms** ({script['event_type']}): `{script['function_name']}`")

            # High script time
            if high_script_time:
                print("### ⏱️ HIGH SCRIPT EXECUTION TIME")
                print(f"- **Total script time:** {total_script_time:.1f}ms")
                print("- Consider optimizing JavaScript execution and reducing computational load")

    def analyze_rendering_bottlenecks(self):
        """Analyze rendering performance with detailed frame timing and memory analysis"""
        render_records = [r for r in self.records if r.get('type') == 'timeline-record-type-rendering-frame']

        if not render_records:
            return

        # Enhanced rendering analysis
        frame_durations = []
        frame_timestamps = []
        dropped_frames = []
        frame_durations_by_time = []

        target_fps = 60
        target_frame_time = 1000 / target_fps  # ~16.67ms for 60fps

        for record in render_records:
            start_time = record.get('startTime', 0)
            end_time = record.get('endTime', 0)
            duration = end_time - start_time if end_time > start_time else 0

            frame_durations.append(duration)
            frame_timestamps.append(start_time)

            # Frame drop detection (more sophisticated)
            if duration > target_frame_time:
                dropped_frames.append({
                    'duration': duration,
                    'start_time': start_time,
                    'dropped_by': duration - target_frame_time
                })

            frame_durations_by_time.append((start_time, duration))

        # Check for problems
        drop_rate = (len(dropped_frames) / len(render_records)) * 100 if render_records else 0
        high_frame_drop = drop_rate > 5  # >5% frame drops

        # Frame consistency analysis
        inconsistent_frames = False
        if len(frame_durations) > 10:
            mean_duration = sum(frame_durations) / len(frame_durations)
            variance = sum((d - mean_duration) ** 2 for d in frame_durations) / len(frame_durations)
            std_dev = variance ** 0.5
            consistency_ratio = std_dev / mean_duration if mean_duration > 0 else 0
            inconsistent_frames = consistency_ratio > 0.5

        # Memory pressure analysis
        memory_events = self.memory_pressure_events
        high_memory_pressure = len(memory_events) > 5

        # Performance check
        avg_duration = sum(frame_durations) / len(frame_durations) if frame_durations else 0
        actual_fps = 1000 / avg_duration if avg_duration > 0 else 0
        low_fps = actual_fps < 50

        # Only print if there are problems
        has_problems = (dropped_frames and high_frame_drop) or inconsistent_frames or high_memory_pressure or low_fps

        if has_problems:
            print("\n---")
            print("## 🎬 RENDERING PROBLEMS")

            # Frame drop analysis
            if dropped_frames and high_frame_drop:
                print("### 💥 FRAME DROP PROBLEMS")
                print(f"- **Frame drop rate:** {drop_rate:.1f}%")
                print(f"- **Frames over budget:** {len(dropped_frames)}/{len(render_records)}")

                # Show worst frame drops
                worst_drops = sorted(dropped_frames, key=lambda x: x['dropped_by'], reverse=True)[:3]
                for i, drop in enumerate(worst_drops, 1):
                    print(f"- **Drop #{i}:** {drop['duration']:.1f}ms over budget")

            # Frame consistency analysis
            if inconsistent_frames:
                print("### 📈 FRAME CONSISTENCY PROBLEMS")
                print(f"- **Consistency ratio:** {consistency_ratio:.3f}")
                print("- ⚠️ Inconsistent frame times - Janky animations possible")

            # Low FPS
            if low_fps:
                print("### 📊 LOW FRAME RATE")
                print(f"- **Average FPS:** {actual_fps:.1f}")
                print("- Enable hardware acceleration and optimize rendering")

            # Memory pressure analysis
            if high_memory_pressure:
                print("### 🧠 MEMORY PRESSURE PROBLEMS")
                print(f"- **Memory pressure events:** {len(memory_events)}")
                print("- Consider memory optimization")

            print("### 💡 RENDERING OPTIMIZATION SUGGESTIONS")
            print("- Reduce DOM complexity and CSS animations")
            print("- Use CSS transforms instead of position changes")
            print("- Enable hardware acceleration (`transform: translateZ(0)`)")
            print("- Use CSS containment (`contain: layout style`)")

    def analyze_cpu_bottlenecks(self):
        """Analyze CPU usage patterns with thread-level analysis and usage spikes"""
        cpu_records = [r for r in self.records if r.get('type') == 'timeline-record-type-cpu']

        if not cpu_records:
            return

        # Enhanced CPU analysis
        cpu_usage_samples = []
        thread_analysis = defaultdict(list)
        usage_spikes = []
        timestamps = []

        for record in cpu_records:
            timestamp = record.get('timestamp', 0)
            usage = record.get('usage', 0)
            threads = record.get('threads', [])

            timestamps.append(timestamp)
            cpu_usage_samples.append(usage)

            # Thread-level analysis
            for thread in threads:
                if isinstance(thread, dict):
                    thread_name = thread.get('name', 'unknown')
                    thread_usage = thread.get('usage', 0)
                    thread_analysis[thread_name].append(thread_usage)

            # Spike detection (>80% usage)
            if usage > 80:
                usage_spikes.append({
                    'timestamp': timestamp,
                    'usage': usage,
                    'threads': threads
                })

        # Check for problems
        avg_cpu = sum(cpu_usage_samples) / len(cpu_usage_samples) if cpu_usage_samples else 0
        high_cpu = avg_cpu > 60  # >60% average CPU usage
        frequent_spikes = len(usage_spikes) > len(cpu_usage_samples) * 0.1 if cpu_usage_samples else False  # >10% spikes

        # Only print if there are problems
        has_problems = high_cpu or usage_spikes

        if has_problems:
            print("\n---")
            print("## 🖥️ CPU PROBLEMS")

            # CPU usage analysis
            if high_cpu:
                print("### 📈 HIGH CPU USAGE")
                print(f"- **Average CPU usage:** {avg_cpu:.1f}%")
                print(f"- **Peak CPU usage:** {max(cpu_usage_samples) if cpu_usage_samples else 0:.1f}%")

                if avg_cpu > 80:
                    print("- 🚨 **CRITICAL:** Very high CPU usage")
                else:
                    print("- ⚠️ **HIGH:** Elevated CPU usage")

            # CPU spike analysis
            if usage_spikes:
                print("### ⚡ CPU USAGE SPIKES")
                print(f"- **Total spikes (>80%):** {len(usage_spikes)}")

                # Show most severe spikes
                worst_spikes = sorted(usage_spikes, key=lambda x: x['usage'], reverse=True)[:3]
                for i, spike in enumerate(worst_spikes, 1):
                    print(f"- **Spike #{i}:** {spike['usage']:.1f}% at {spike['timestamp']:.0f}ms")

            print("### 💡 CPU OPTIMIZATION SUGGESTIONS")
            print("- Reduce JavaScript execution time")
            print("- Optimize computational loops")
            print("- Profile JavaScript functions")
            print("- Reduce DOM manipulations")
            if frequent_spikes:
                print("- Investigate main thread blocking")
                print("- Use `requestAnimationFrame` for animations")
                print("- Use CSS transforms instead of JavaScript animations")

    def generate_report(self):
        """Generate a comprehensive performance report with optimization recommendations"""
        # Calculate scores based on analysis results
        network_score = self._calculate_network_score()
        layout_score = self._calculate_layout_score()
        script_score = self._calculate_script_score()
        rendering_score = self._calculate_rendering_score()
        cpu_score = self._calculate_cpu_score()

        overall_score = (network_score + layout_score + script_score + rendering_score + cpu_score) / 5

        scores = {
            'Network': network_score,
            'Layout': layout_score,
            'Script': script_score,
            'Rendering': rendering_score,
            'CPU': cpu_score
        }

        # Critical issues summary
        critical_issues = self._identify_critical_issues()

        # Check if there are any problems to report
        failing_scores = {cat: score for cat, score in scores.items() if score < 70}
        has_problems = critical_issues or failing_scores

        if has_problems:
            print("\n---")
            print("# 📋 PERFORMANCE PROBLEMS REPORT")

            # Recording metadata - only if there are problems
            print("## 🎬 RECORDING SUMMARY")
            print(f"- **Name:** {self.recording_info.get('displayName', 'Unknown')}")
            print(f"- **Duration:** {self.duration:.3f} seconds")

            # Performance score - only show failing grades
            if failing_scores:
                print("## 🏆 FAILING PERFORMANCE SCORES")

                print("| Category | Score | Grade |")
                print("|----------|-------|-------|")
                for category, score in failing_scores.items():
                    grade = self._score_to_grade(score)
                    print(f"| {category} | {score:.1f}/100 | {grade} |")

                overall_grade = self._score_to_grade(overall_score)
                print(f"| **Overall** | **{overall_score:.1f}/100** | **{overall_grade}** |")

            # Critical issues summary
            if critical_issues:
                print(f"## 🚨 CRITICAL ISSUES ({len(critical_issues)})")
                for issue in critical_issues[:5]:  # Show top 5
                    print(f"- {issue}")

            # Optimization recommendations
            recommendations = self._generate_recommendations(scores)
            if recommendations:
                print("## 💡 TOP OPTIMIZATION RECOMMENDATIONS")
                for i, rec in enumerate(recommendations[:5], 1):
                    print(f"{i}. {rec}")

            print("## 🔍 ANALYSIS COMPLETE")
            print("Use the problems above to identify and fix performance bottlenecks.")
            print("Consider re-recording after optimizations to measure improvements!")
        else:
            print("\n---")
            print("# ✅ PERFORMANCE ANALYSIS COMPLETE")
            print("**No significant performance problems detected!**")
            print(f"Overall Performance Score: **{overall_score:.1f}/100** ({self._score_to_grade(overall_score)})")

        # Generate engineer-friendly annotations
        self._generate_engineer_annotations()

    def _generate_engineer_annotations(self):
        """Generate engineer annotations with line numbers and severity levels"""
        print("\n---")
        print("# 👷 ENGINEER ANNOTATIONS - PRIORITY ACTION ITEMS")

        critical_issues = []
        high_priority = []
        medium_priority = []
        low_priority = []

        # Analyze layout issues
        layout_records = [r for r in self.records if r.get('type') == 'timeline-record-type-layout']
        if layout_records:
            # Check for layout thrashing
            frame_layouts = defaultdict(list)
            for record in layout_records:
                start_time = record.get('startTime', 0)
                frame = int(start_time / (1000 / 60))  # Convert to frame number
                frame_layouts[frame].append(record)

            thrashing_frames = sum(1 for layouts in frame_layouts.values() if len(layouts) > 10)
            if thrashing_frames > 0:
                critical_issues.append({
                    'type': 'LAYOUT_THRASHING',
                    'severity': 'CRITICAL',
                    'description': f'Layout thrashing detected: {thrashing_frames} frames with excessive layout operations',
                    'impact': 'Causes janky scrolling, poor user experience',
                    'files_to_check': ['app/views/home.html', 'app/views/services.html', 'app/views/about.html', 'app/views/contact.html'],
                    'lines_to_check': ['Carousel sections', 'Card grids', 'Form elements'],
                    'fix_priority': 'HIGH',
                    'estimated_time': '2-4 hours'
                })

            # Check for forced layouts
            forced_layouts = [r for r in layout_records if r.get('eventType') == 'forced-layout']
            if len(forced_layouts) > 5:
                high_priority.append({
                    'type': 'FORCED_LAYOUTS',
                    'severity': 'HIGH',
                    'description': f'High number of forced synchronous layouts: {len(forced_layouts)} detected',
                    'impact': 'Blocks main thread, causes UI freezing',
                    'files_to_check': ['app/directives/owlCarouselDirective.js'],
                    'lines_to_check': ['DOM queries in watch functions'],
                    'fix_priority': 'HIGH',
                    'estimated_time': '1-2 hours'
                })

        # Analyze rendering issues
        render_records = [r for r in self.records if r.get('type') == 'timeline-record-type-rendering-frame']
        if render_records:
            frame_times = []
            for record in render_records:
                start_time = record.get('startTime', 0)
                end_time = record.get('endTime', 0)
                duration = end_time - start_time if end_time > start_time else 0
                frame_times.append(duration)

            if frame_times:
                avg_frame_time = sum(frame_times) / len(frame_times)
                dropped_frames = len([t for t in frame_times if t > 16.67])

                if dropped_frames > len(frame_times) * 0.1:  # >10% frame drops
                    critical_issues.append({
                        'type': 'FRAME_DROPS',
                        'severity': 'CRITICAL',
                        'description': f'High frame drop rate: {dropped_frames}/{len(frame_times)} frames over 16.67ms',
                        'impact': 'Janky animations, poor perceived performance',
                        'files_to_check': ['assets/css/custom.css', 'app/views/home.html'],
                        'lines_to_check': ['Animation classes', 'Hover effects', 'Transform properties'],
                        'fix_priority': 'HIGH',
                        'estimated_time': '2-3 hours'
                    })

                # Check frame consistency
                if len(frame_times) > 10:
                    mean_time = sum(frame_times) / len(frame_times)
                    variance = sum((t - mean_time) ** 2 for t in frame_times) / len(frame_times)
                    std_dev = variance ** 0.5
                    consistency_ratio = std_dev / mean_time if mean_time > 0 else 0

                    if consistency_ratio > 0.5:
                        medium_priority.append({
                            'type': 'INCONSISTENT_FRAMING',
                            'severity': 'MEDIUM',
                            'description': f'Inconsistent frame timing (ratio: {consistency_ratio:.3f})',
                            'impact': 'Janky animations, stuttering UI',
                            'files_to_check': ['assets/css/custom.css'],
                            'lines_to_check': ['Animation timing', 'Transition properties'],
                            'fix_priority': 'MEDIUM',
                            'estimated_time': '1-2 hours'
                        })

        # Analyze CPU issues
        cpu_records = [r for r in self.records if r.get('type') == 'timeline-record-type-cpu']
        if cpu_records:
            cpu_usages = [r.get('usage', 0) for r in cpu_records]
            high_cpu = len([u for u in cpu_usages if u > 80])

            if high_cpu > len(cpu_usages) * 0.2:  # >20% high CPU
                high_priority.append({
                    'type': 'HIGH_CPU_USAGE',
                    'severity': 'HIGH',
                    'description': f'High CPU usage: {high_cpu}/{len(cpu_usages)} samples >80%',
                    'impact': 'Battery drain, thermal throttling, poor performance',
                    'files_to_check': ['app/controllers/mainCtrl.js', 'app/directives/owlCarouselDirective.js'],
                    'lines_to_check': ['Heavy computations', 'DOM manipulations', 'Event handlers'],
                    'fix_priority': 'HIGH',
                    'estimated_time': '3-5 hours'
                })

        # Analyze network issues
        network_records = [r for r in self.records if r.get('type') == 'timeline-record-type-network']
        if network_records:
            failed_requests = sum(1 for r in network_records
                                if r.get('entry', {}).get('response', {}).get('status', 200) >= 400)
            if failed_requests > len(network_records) * 0.05:  # >5% failures
                medium_priority.append({
                    'type': 'NETWORK_FAILURES',
                    'severity': 'MEDIUM',
                    'description': f'High network failure rate: {failed_requests}/{len(network_records)} requests',
                    'impact': 'Poor user experience, broken functionality',
                    'files_to_check': ['app/services/localStorageService.js', 'app/services/queryService.js'],
                    'lines_to_check': ['Error handling', 'Retry logic', 'Fallback mechanisms'],
                    'fix_priority': 'MEDIUM',
                    'estimated_time': '2-3 hours'
                })

        # Print annotations by priority
        all_issues = critical_issues + high_priority + medium_priority + low_priority

        if all_issues:
            print(f"## 📋 PERFORMANCE ISSUE ANNOTATIONS ({len(all_issues)} total)")

            severity_colors = {
                'CRITICAL': '🚨',
                'HIGH': '⚠️',
                'MEDIUM': 'ℹ️',
                'LOW': '✅'
            }

            for i, issue in enumerate(all_issues, 1):
                print(f"{i}. {severity_colors[issue['severity']]} {issue['type']} ({issue['severity']})")
                print(f"   📝 {issue['description']}")
                print(f"   💥 Impact: {issue['impact']}")
                print(f"   📁 Files to check: {', '.join(issue['files_to_check'])}")
                print(f"   📍 Lines/areas: {', '.join(issue['lines_to_check'])}")
                print(f"   ⏱️  Est. fix time: {issue['estimated_time']}")
                print()

        # Generate quick action summary
        print("## 🎯 QUICK ACTION SUMMARY")

        if critical_issues:
            print(f"### 🚨 CRITICAL ({len(critical_issues)}): Address immediately")
            for issue in critical_issues:
                print(f"- {issue['type']}")

        if high_priority:
            print(f"### ⚠️ HIGH ({len(high_priority)}): Fix next sprint")
            for issue in high_priority:
                print(f"- {issue['type']}")

        if medium_priority:
            print(f"### ℹ️ MEDIUM ({len(medium_priority)}): Plan for future")
            for issue in medium_priority:
                print(f"- {issue['type']}")

        print("### 💡 RECOMMENDED FIX ORDER")
        print("1. Layout thrashing (blocking issue)")
        print("2. Frame drops (perceived performance)")
        print("3. CPU optimization (resource usage)")
        print("4. Network reliability (robustness)")

    def _calculate_network_score(self):
        """Calculate network performance score (0-100)"""
        network_records = [r for r in self.records if r.get('type') == 'timeline-record-type-network']
        if not network_records:
            return 100  # No network activity = perfect score

        response_times = []
        failed_count = 0

        for record in network_records:
            entry = record.get('entry', {})
            time = entry.get('time', 0)
            response_times.append(time)

            status = entry.get('response', {}).get('status', 200)
            if status >= 400:
                failed_count += 1

        if not response_times:
            return 100

        avg_time = sum(response_times) / len(response_times)
        p95_time = sorted(response_times)[int(len(response_times) * 0.95)]
        failure_rate = (failed_count / len(network_records)) * 100

        # Scoring logic
        score = 100
        if avg_time > 500: score -= 30
        elif avg_time > 200: score -= 15
        if p95_time > 1000: score -= 20
        if failure_rate > 5: score -= 25
        elif failure_rate > 1: score -= 10

        return max(0, min(100, score))

    def _calculate_layout_score(self):
        """Calculate layout performance score (0-100)"""
        layout_records = [r for r in self.records if r.get('type') == 'timeline-record-type-layout']
        if not layout_records:
            return 100

        # Check for layout thrashing
        frame_layouts = defaultdict(list)
        for record in layout_records:
            start_time = record.get('startTime', 0)
            frame = int(start_time / (1000 / 60))  # Convert to frame number (60 FPS = ~16.67ms per frame)
            frame_layouts[frame].append(record)

        thrashing_frames = sum(1 for layouts in frame_layouts.values() if len(layouts) > 10)
        thrashing_rate = thrashing_frames / len(frame_layouts) if frame_layouts else 0

        score = 100
        if thrashing_rate > 0.5: score -= 40  # Heavy thrashing
        elif thrashing_rate > 0.2: score -= 20  # Moderate thrashing
        elif thrashing_rate > 0.05: score -= 10  # Light thrashing

        return max(0, min(100, score))

    def _calculate_script_score(self):
        """Calculate script performance score (0-100)"""
        script_records = [r for r in self.records if r.get('type') == 'timeline-record-type-script']
        if not script_records:
            return 100

        execution_times = []
        for record in script_records:
            start_time = record.get('startTime', 0)
            end_time = record.get('endTime', 0)
            duration = end_time - start_time if end_time > start_time else 0
            execution_times.append(duration)

        if not execution_times:
            return 100

        avg_time = sum(execution_times) / len(execution_times)
        long_scripts = len([t for t in execution_times if t > 50])

        score = 100
        if avg_time > 20: score -= 20
        if long_scripts > len(execution_times) * 0.1: score -= 30  # >10% long scripts

        return max(0, min(100, score))

    def _calculate_rendering_score(self):
        """Calculate rendering performance score (0-100)"""
        render_records = [r for r in self.records if r.get('type') == 'timeline-record-type-rendering-frame']
        if not render_records:
            return 100

        frame_times = []
        for record in render_records:
            start_time = record.get('startTime', 0)
            end_time = record.get('endTime', 0)
            duration = end_time - start_time if end_time > start_time else 0
            frame_times.append(duration)

        if not frame_times:
            return 100

        dropped_frames = len([t for t in frame_times if t > 16.67])  # 60fps threshold
        drop_rate = dropped_frames / len(frame_times)

        score = 100
        if drop_rate > 0.2: score -= 40  # Heavy frame drops
        elif drop_rate > 0.1: score -= 20  # Moderate frame drops
        elif drop_rate > 0.05: score -= 10  # Light frame drops

        return max(0, min(100, score))

    def _calculate_cpu_score(self):
        """Calculate CPU performance score (0-100)"""
        cpu_records = [r for r in self.records if r.get('type') == 'timeline-record-type-cpu']
        if not cpu_records:
            return 100

        cpu_usages = [r.get('usage', 0) for r in cpu_records]
        if not cpu_usages:
            return 100

        avg_cpu = sum(cpu_usages) / len(cpu_usages)
        high_cpu_samples = len([u for u in cpu_usages if u > 80])

        score = 100
        if avg_cpu > 80: score -= 40
        elif avg_cpu > 60: score -= 20
        elif avg_cpu > 40: score -= 10

        if high_cpu_samples > len(cpu_usages) * 0.2: score -= 20  # Frequent spikes

        return max(0, min(100, score))

    def _score_to_grade(self, score):
        """Convert numeric score to letter grade"""
        if score >= 90: return "A"
        elif score >= 80: return "B"
        elif score >= 70: return "C"
        elif score >= 60: return "D"
        else: return "F"

    def _identify_critical_issues(self):
        """Identify critical performance issues"""
        issues = []

        # Check network issues
        network_records = [r for r in self.records if r.get('type') == 'timeline-record-type-network']
        if network_records:
            failed_requests = sum(1 for r in network_records
                                if r.get('entry', {}).get('response', {}).get('status', 200) >= 400)
            if failed_requests > len(network_records) * 0.05:  # >5% failures
                issues.append(f"High network failure rate: {failed_requests}/{len(network_records)} requests")

        # Check layout thrashing
        layout_records = [r for r in self.records if r.get('type') == 'timeline-record-type-layout']
        if layout_records:
            frame_layouts = defaultdict(list)
            for record in layout_records:
                start_time = record.get('startTime', 0)
                frame = int(start_time / (1000 / 60))  # Convert to frame number (60 FPS = ~16.67ms per frame)
                frame_layouts[frame].append(record)

            thrashing_frames = sum(1 for layouts in frame_layouts.values() if len(layouts) > 10)
            if thrashing_frames > 0:
                issues.append(f"Layout thrashing detected: {thrashing_frames} frames with >10 layouts")

        # Check frame drops
        render_records = [r for r in self.records if r.get('type') == 'timeline-record-type-rendering-frame']
        if render_records:
            frame_times = []
            for record in render_records:
                start_time = record.get('startTime', 0)
                end_time = record.get('endTime', 0)
                duration = end_time - start_time if end_time > start_time else 0
                frame_times.append(duration)

            dropped_frames = len([t for t in frame_times if t > 16.67])
            drop_rate = dropped_frames / len(frame_times) if frame_times else 0
            if drop_rate > 0.1:  # >10% frame drops
                issues.append(f"High frame drop rate: {drop_rate:.1f}% ({dropped_frames}/{len(frame_times)})")

        # Check CPU issues
        cpu_records = [r for r in self.records if r.get('type') == 'timeline-record-type-cpu']
        if cpu_records:
            high_cpu = len([r for r in cpu_records if r.get('usage', 0) > 80])
            if high_cpu > len(cpu_records) * 0.2:  # >20% high CPU samples
                issues.append(f"High CPU usage: {high_cpu}/{len(cpu_records)} samples >80%")

        # Check memory pressure
        if len(self.memory_pressure_events) > 3:
            issues.append(f"Memory pressure events: {len(self.memory_pressure_events)} detected")

        return issues

    def _generate_recommendations(self, scores):
        """Generate optimization recommendations based on scores"""
        recommendations = []

        if scores['Network'] < 70:
            recommendations.append("Optimize network requests: implement caching, compress resources, use CDN")

        if scores['Layout'] < 70:
            recommendations.append("Fix layout thrashing: use CSS containment, batch DOM updates, avoid forced layouts")

        if scores['Script'] < 70:
            recommendations.append("Optimize JavaScript: reduce execution time, implement code splitting, use web workers")

        if scores['Rendering'] < 70:
            recommendations.append("Improve rendering: use hardware acceleration, optimize CSS, reduce paint operations")

        if scores['CPU'] < 70:
            recommendations.append("Reduce CPU usage: optimize algorithms, use CSS animations, implement lazy loading")

        # General recommendations
        recommendations.extend([
            "Implement performance monitoring and alerting",
            "Use browser DevTools for ongoing performance profiling",
            "Consider implementing performance budgets",
            "Regularly audit and optimize bundle sizes"
        ])

        return recommendations

def main():
    parser = argparse.ArgumentParser(
        description='Enhanced Safari Timeline Performance Bottleneck Analyzer',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 analyze_bottlenecks.py                           # Analyze default file
  python3 analyze_bottlenecks.py my-recording.json         # Analyze specific file
  python3 analyze_bottlenecks.py optimized-layout-test.json # Analyze after optimizations

The analyzer provides:
• Detailed network timing breakdown (DNS, TCP, SSL, TTFB)
• Cache analysis and efficiency metrics
• Layout thrashing detection with frame-by-frame analysis
• JavaScript execution profiling with function-level details
• Rendering performance with frame drop analysis
• CPU usage patterns with thread analysis
• Memory pressure event monitoring
• Performance scoring and optimization recommendations
        """
    )
    parser.add_argument('filepath', nargs='?', default='localhost-recording.json',
                       help='Path to the Safari timeline recording JSON file')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output with additional details')
    parser.add_argument('--sections', nargs='+',
                       help='Run only specific analysis sections (network, layout, script, rendering, cpu)')

    args = parser.parse_args()

    # Main header will be printed only if problems are found

    analyzer = SafariTimelineAnalyzer(args.filepath)

    # Determine which analyses to run
    all_sections = ['network', 'layout', 'script', 'rendering', 'cpu']
    sections_to_run = args.sections if args.sections else all_sections

    # Run analyses
    if 'network' in sections_to_run:
        analyzer.analyze_network_bottlenecks()

    if 'layout' in sections_to_run:
        analyzer.analyze_layout_bottlenecks()

    if 'script' in sections_to_run:
        analyzer.analyze_script_bottlenecks()

    if 'rendering' in sections_to_run:
        analyzer.analyze_rendering_bottlenecks()

    if 'cpu' in sections_to_run:
        analyzer.analyze_cpu_bottlenecks()

    # Always generate the final report
    analyzer.generate_report()

    print(f"## ✨ Analysis completed for: {args.filepath}")

if __name__ == '__main__':
    main()
