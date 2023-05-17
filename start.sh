#!/bin/bash

for i in {0..3}; do
  for j in {0..3}; do
    node index.js group-0 zone-$i-$j >> logs/zone-$i-$j.log &
  done
done
