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
	log.Printf("Cubemap serving from \"%v\" on port %v...\n", rootPath, *serverPort)
	http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir(rootPath))))
	http.HandleFunc("/setlocation", setLocation)
	http.HandleFunc("/delete", delete)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%v", *serverPort), nil))
}

func delete(w http.ResponseWriter, req *http.Request) {
	name := req.URL.Query().Get("name")
	employeeList := getEmployeeList()

	for i, employee := range employeeList {
		if employee.Name == name {

			employeeList = employeeList[:i+copy(employeeList[i:], employeeList[i+1:])]
			saveEmployeeList(employeeList)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
}

func getEmployeeList() []employee {

	fileBytes, e := ioutil.ReadFile(rootPath + "/employees.json")
	if e != nil {
		log.Printf("File error: %v\n", e)
		return nil
	}

	employeeList := make([]employee, 0)

	err := json.Unmarshal(fileBytes, &employeeList)

	if err != nil {
		log.Printf("Could not decode %v/employees.json for editing. Reason: %v", rootPath, err)
		return nil
	}
	return employeeList
}

func saveEmployeeList(employeeList []employee) {

	outbytes, err := json.MarshalIndent(employeeList, "", "\t")
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

	employeeList := getEmployeeList()

	// make sure the user didn't try to change to a name that is already taken
	if newEmpInfo.PreviousName != newEmpInfo.Name {
		for _, employee := range employeeList {
			if employee.Name == newEmpInfo.Name {
				http.Error(w, "Can't change to an existing name", http.StatusConflict)
				return
			}
		}
	}

	var isnew = true
	for i, employee := range employeeList {
		if employee.Name == newEmpInfo.PreviousName {
			isnew = false
			employee.Structure = newEmpInfo.Structure
			employee.Name = newEmpInfo.Name
			employeeList[i] = employee
			w.WriteHeader(http.StatusNoContent)
			break
		}
	}

	if isnew {
		// add'
		var emp = employee{Name: newEmpInfo.Name, Structure: newEmpInfo.Structure}
		employeeList = append(employeeList, emp)
		w.WriteHeader(http.StatusCreated)
		fmt.Fprintf(w, "%+v", emp)
	}

	saveEmployeeList(employeeList)
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
