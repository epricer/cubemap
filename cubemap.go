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

func loadJSONFromFile(t interface{}, filepath string) error {
	fileBytes, err := ioutil.ReadFile(filepath)
	if err != nil {
		log.Printf("File error opening %v. Reason: %v\n", filepath, err)
		return err
	}

	err = json.Unmarshal(fileBytes, t)

	if err != nil {
		log.Printf("Could not decode %v for editing. Reason: %v", filepath, err)
		return err
	}
	return nil
}

func getFloorplan() floorplan {
	var f floorplan
	loadJSONFromFile(&f, rootPath+"/map.json")
	return f
}

func getEmployeeList() []employee {
	employeeList := make([]employee, 0)
	loadJSONFromFile(&employeeList, rootPath+"/employees.json")
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
		http.Error(w, "Please send a request body", http.StatusBadRequest)
		return
	}
	err := json.NewDecoder(req.Body).Decode(&newEmpInfo)
	if err != nil {
		log.Printf("error decoding request: %+v", http.StatusBadRequest)
		http.Error(w, err.Error(), 400)
		return
	}

	//TODO: Make sure the structure exists and is editable!
	fp := getFloorplan()
	employeeList := getEmployeeList()

	structureOkay := false
	for _, sg := range fp.StructureGroups {
		for _, s := range sg.Structures {
			if s.Name == newEmpInfo.Structure {
				structureOkay = (s.Editable == true)
				break
			}
		}
	}

	if !structureOkay {
		http.Error(w, "That structure doesn't exist or is uneditable", http.StatusUnauthorized)
	}

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

type floorplan struct {
	Height          int              `json:"height"`
	Width           int              `json:"width"`
	StructureGroups []structuregroup `json:"structuregroups"`
}

type structuregroup struct {
	Type       string      `json:"type"`
	Structures []structure `json:"structures"`
}

type structure struct {
	Name     string `json:"name"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Editable bool   `json:"editable"`
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
