package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

var rootPath = ""

func main() {

	rootPath = *flag.String("path", ".", "root path for the web content")
	var serverPort = flag.Int("port", 8080, "port for web server")
	flag.Parse()
	log.Printf("Cubemap serving from \"%v\" on port %v...\n", rootPath, *serverPort)
	http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir(rootPath))))
	http.HandleFunc("/setlocation", handleSetLocation)
	http.HandleFunc("/delete", handleDelete)
	http.HandleFunc("/quotes", func(w http.ResponseWriter, r *http.Request) {
		serveJSON(w, r, getQuotes())
	})
	http.HandleFunc("/map", func(w http.ResponseWriter, r *http.Request) {
		serveJSON(w, r, getFloorplan())
	})
	http.HandleFunc("/employees", func(w http.ResponseWriter, r *http.Request) {
		serveJSON(w, r, getEmployeeList())
	})

	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%v", *serverPort), nil))
}

func serveJSON(w http.ResponseWriter, req *http.Request, v interface{}) {

	jsonData, err := json.Marshal(v)
	if err != nil {
		http.Error(w, "Bad json data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonData)
}

func handleDelete(w http.ResponseWriter, req *http.Request) {
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

func getQuotes() []quote {
	quotes := make([]quote, 0)
	loadJSONFromFile(&quotes, rootPath+"/quotes.json")
	return quotes
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

func handleSetLocation(w http.ResponseWriter, req *http.Request) {

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
				log.Printf("structure %v exists", newEmpInfo.Structure)
				break
			}
		}
	}

	if !structureOkay {
		log.Printf("structure %v does not exist or is not editable", newEmpInfo.Structure)
		http.Error(w, "That structure doesn't exist or is uneditable", http.StatusUnauthorized)
		return
	}

	var isnew = true
	for i, employee := range employeeList {
		if (employee.Name == newEmpInfo.PreviousName) || ((employee.Name == newEmpInfo.Name) && len(strings.TrimSpace(newEmpInfo.PreviousName)) == 0) {
			log.Printf("Updating existing %v as %v in %v", employee.Name, newEmpInfo.Name, newEmpInfo.Structure)

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
		log.Printf("Adding new person %v", newEmpInfo.Name)
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

type quote struct {
	Quote string `json:"quote"`
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
