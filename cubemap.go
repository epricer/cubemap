package main

import (
	"encoding/json"
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

	var newEmpInfo change
	if req.Body == nil {
		log.Printf("Request body is nil")
		http.Error(w, "Please send a request body", 400)
		return
	}
	err := json.NewDecoder(req.Body).Decode(&newEmpInfo)
	if err != nil {
		log.Printf("error decoding request: %+v", err)
		http.Error(w, err.Error(), 400)
		return
	}

	fileBytes, e := ioutil.ReadFile(rootPath + "/employees.json")
	if e != nil {
		fmt.Printf("File error: %v\n", e)
		return
	}

	employeeList := make([]employee, 0)

	if err != nil {
		log.Printf("Could not open %v/employees.json for editing. Reason: %v", rootPath, err)
		return
	}

	err = json.Unmarshal(fileBytes, &employeeList)
	log.Printf("employee list from file: %+v", employeeList)

	if err != nil {
		log.Printf("Could not decode %v/employees.json for editing. Reason: %v", rootPath, err)
		return
	}

	var found = false
	for i, employee := range employeeList {
		log.Printf("Comparing to %+v", employee)
		if employee.Name == newEmpInfo.PreviousName {
			found = true
			employee.Structure = newEmpInfo.Structure
			employee.Name = newEmpInfo.Name
			employeeList[i] = employee
			break
		}
	}

	if !found {
		// add'
		log.Printf("Adding %+v", newEmpInfo)
		employeeList = append(employeeList, employee{Name: newEmpInfo.Name, Structure: newEmpInfo.Structure})
	}

	outbytes, err := json.MarshalIndent(employeeList, "", "\t")
	log.Printf("employee list: %+v", employeeList)
	if err != nil {
		log.Printf("Could not unmarshal to json. Reason: %v", err)
		return
	}

	err = ioutil.WriteFile(rootPath+"/employees.json", outbytes, 0644)
	if err != nil {
		log.Printf("Could not write %v/employees.jsonxml. Reason: %v", rootPath, err)
		return
	}
}

type employee struct {
	Name      string `json:"name"`
	Structure string `json:"structure"`
}
type change struct {
	Name         string `json:"name"`
	Structure    string `json:"structure"`
	PreviousName string `json:"previousname"`
}
