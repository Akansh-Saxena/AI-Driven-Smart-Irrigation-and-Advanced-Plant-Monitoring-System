#!/bin/sh
git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_NAME" = "AI Deployer" ] || [ "$GIT_AUTHOR_NAME" = "AI Developer" ]; then
    GIT_AUTHOR_NAME="Akansh Saxena"
    GIT_AUTHOR_EMAIL="saxenaakansh29@gmail.com"
fi
if [ "$GIT_COMMITTER_NAME" = "AI Deployer" ] || [ "$GIT_COMMITTER_NAME" = "AI Developer" ]; then
    GIT_COMMITTER_NAME="Akansh Saxena"
    GIT_COMMITTER_EMAIL="saxenaakansh29@gmail.com"
fi
export GIT_AUTHOR_NAME
export GIT_AUTHOR_EMAIL
export GIT_COMMITTER_NAME
export GIT_COMMITTER_EMAIL
' HEAD
