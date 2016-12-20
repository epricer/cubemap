package main

import (
	"encoding/xml"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
)

var rootPath = ""

func main() {

	rootPath = *flag.String("path", ".", "root path for the web content")
	var serverPort = flag.Int("port", 8080, "port for web server")
	flag.Parse()
	fmt.Printf("Cubemap serving from \"%v\" on port %v...\n", rootPath, *serverPort)
	http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir(rootPath))))
	http.HandleFunc("/setlocation", setLocation)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%v", *serverPort), nil))
}

func setLocation(w http.ResponseWriter, req *http.Request) {
	var params = req.URL.Query()

	var name = params["name"][0]
	var location = params["location"][0]
	var delete = len(params["delete"]) > 0

	xmlFile, err := ioutil.ReadFile(rootPath + "/employees.xml")
	if err != nil {
		log.Printf("Could not open %v/employees.xml for editing. Reason: %v", rootPath, err)
		return
	}

	doc := employees{}
	err = xml.Unmarshal(xmlFile, &doc)
	if err != nil {
		log.Printf("Could not unmarshal %v/employees.xml for editing. Reason: %v", rootPath, err)
		return
	}

	var found = false
	for i, employee := range doc.Employees {
		if employee.Name == name {
			found = true
			if delete {
				doc.Employees = append(doc.Employees[:i], doc.Employees[i+1:]...)
			} else {
				employee.StructureName = location
				doc.Employees[i] = employee
			}
			break
		}
	}

	if !found && !delete {
		// add
		doc.Employees = append(doc.Employees, employee{XMLName: xml.Name{Local: "employee"}, Name: name, StructureName: location})
	}

	outbytes, err := xml.MarshalIndent(doc, "", "\t")
	if err != nil {
		log.Printf("Could not unmarshal to xml. Reason: %v", err)
		return
	}

	err = ioutil.WriteFile(rootPath+"/employees.xml", outbytes, 0644)
	if err != nil {
		log.Printf("Could not write %v/employees.xml. Reason: %v", rootPath, err)
		return
	}
}

type employees struct {
	XMLName   xml.Name   `xml:"employees"`
	Employees []employee `xml:"employee"`
}

type employee struct {
	XMLName       xml.Name `xml:"employee"`
	Name          string   `xml:"name,attr"`
	StructureName string   `xml:"structurename,attr"`
}
