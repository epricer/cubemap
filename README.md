# README #

### What is this repository for? ###

* Shows a map of an office.

### How do I get set up? ###

* fill out the map.json file (it will auto-scale to fit, so the units are arbitrary)
* install go
* `$go run cubemap.go`'
* visit http://servername:8080/
* options
 * -init flag to generate files
 * -port port for the web server. Default is 8080
 * -oldport port from which to redirect to the server port. Default is 8080
 * -path root of content. default is "c"
 * -cert certificiate filename (must be specified with key)
 * -key key filename (must be specified with cert)

### TODO ###
* generate the json files as templates with a command line flag
* maybe remove the quotes functionality
* scroll to zoom