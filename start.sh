#!/bin/bash

# Check if at least one argument is given ($1)
if [ -z "$1" ]; then
  echo "Usage: $0 <group-index>"
  exit 1
fi

# Assign the first argument to a variable
GROUP_INDEX="$1"

# Create a new tmux session and detach from it
SESSION_NAME="my_session_$GROUP_INDEX"
tmux new-session -d -s "$SESSION_NAME"

# Initial setup for the first window
tmux rename-window -t "$SESSION_NAME:0" "Group $GROUP_INDEX"

# Start by splitting the window into the first row of panes
tmux split-window -h
tmux split-window -h
tmux select-layout even-horizontal

# Now create the additional rows by splitting each pane and adjusting layout
for i in {1..2}; do
  tmux select-pane -t 0
  tmux split-window -v
  tmux select-pane -t 2
  tmux split-window -v
  tmux select-pane -t 4
  tmux split-window -v
  tmux select-layout tiled
done

# Wait briefly to ensure panes are created
sleep 1

# Run node and tail commands in each pane
PANE=0
for i in {0..2}; do
  for j in {0..2}; do
    tmux send-keys -t "$SESSION_NAME:0.$PANE" "node index.js group-$GROUP_INDEX zone-$i-$j >> logs/zone-$i-$j.log 2>&1 &" C-m
    tmux send-keys -t "$SESSION_NAME:0.$PANE" "sleep 2" C-m  # Wait a bit to ensure the log file is created
    tmux send-keys -t "$SESSION_NAME:0.$PANE" "tail -f logs/zone-$i-$j.log" C-m
    let PANE=PANE+1
  done
done

# Optionally, you can attach to the session if needed
tmux attach -t "$SESSION_NAME"

