"""TaskFlow analytics microservice.

Receives a list of tasks and returns aggregate metrics. This endpoint accepts
only data supplied by the internal Node API; do not expose it publicly without
adding authentication and request-size limits.
"""

import os
from flask import Flask, jsonify, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024
VALID_STATUSES = {"Todo", "In Progress", "Done"}
VALID_PRIORITIES = {"Low", "Medium", "High"}


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "taskflow-python-analytics"})


@app.post("/api/analytics")
def analytics():
    payload = request.get_json(silent=True) or {}
    tasks = payload.get("tasks", [])
    if not isinstance(tasks, list):
        return jsonify({"error": "The tasks field must be a list."}), 400

    safe_tasks = [task for task in tasks if isinstance(task, dict)]
    todo = sum(task.get("status") == "Todo" for task in safe_tasks)
    in_progress = sum(task.get("status") == "In Progress" for task in safe_tasks)
    done = sum(task.get("status") == "Done" for task in safe_tasks)
    total = len(safe_tasks)

    priority_breakdown = {
        priority: sum(task.get("priority") == priority for task in safe_tasks)
        for priority in sorted(VALID_PRIORITIES)
    }
    known_status_count = todo + in_progress + done

    return jsonify({
        "totalTasks": total,
        "todo": todo,
        "inProgress": in_progress,
        "done": done,
        "openTasks": todo + in_progress,
        "completionRate": round((done / total) * 100) if total else 0,
        "priorityBreakdown": priority_breakdown,
        "unclassifiedTasks": total - known_status_count,
        "source": "python-analytics"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
