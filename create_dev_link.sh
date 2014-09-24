#!/bin/bash
cd /home/thibault/dev/automove
mkdir temp
export PYTHONPATH=./temp
/usr/bin/python setup.py build develop --install-dir ./temp
cp ./temp/automove.egg-link /home/thibault/.config/deluge/plugins
rm -fr ./temp
