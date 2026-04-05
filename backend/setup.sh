#!/bin/bash
python manage.py migrate
python manage.py create_admin
echo "Setup complete"
