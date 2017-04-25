package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
)

func main() {

	var rootPath = flag.String("path", ".", "root path for the web content")
	var serverPort = flag.Int("port", 8080, "port for web server")
	var init = flag.Bool("init", false, "flag to generate files")
	var certFile = flag.String("cert", "", "certificiate filename (must be specified with key)")
	var keyFile = flag.String("key", "", "key filename (must be specified with cert)")
	flag.Parse()

	if *init {
		initializeFiles(*rootPath)
		return
	}

	log.Printf("Cubemap serving from \"%v\" on port %v...\n", *rootPath, *serverPort)

	http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir(*rootPath))))

	http.HandleFunc("/update", func(w http.ResponseWriter, r *http.Request) {
		handleUpdate(w, r, *rootPath)
	})

	http.HandleFunc("/delete", func(w http.ResponseWriter, r *http.Request) {
		handleDelete(w, r, *rootPath)
	})

	http.HandleFunc("/quotes", func(w http.ResponseWriter, r *http.Request) {
		serveJSON(w, r, http.StatusOK, getQuotes(*rootPath))
	})

	http.HandleFunc("/map", func(w http.ResponseWriter, r *http.Request) {
		serveJSON(w, r, http.StatusOK, getFloorplan(*rootPath))
	})

	http.HandleFunc("/employees", func(w http.ResponseWriter, r *http.Request) {
		serveJSON(w, r, http.StatusOK, getEmployeeList(*rootPath))
	})

	if len(*certFile) > 0 || len(*keyFile) > 0 {
		if len(*certFile) == 0 {
			log.Fatal("Cert file must be specified if key file is specified")
		}

		if len(*keyFile) == 0 {
			log.Fatal("Key file must be specified if cert file is specified")
		}

		if _, err := os.Stat(*rootPath + "/" + *certFile); os.IsNotExist(err) {
			log.Fatalf("Cert file %v/%v is missing", *rootPath, *certFile)
		}

		if _, err := os.Stat(*rootPath + "/" + *keyFile); os.IsNotExist(err) {
			log.Fatalf("Key file %v/%v is missing", *rootPath, *keyFile)
		}
		log.Fatal(http.ListenAndServeTLS(fmt.Sprintf(":%v", *serverPort), *certFile, *keyFile, nil))
	} else {
		log.Fatal(http.ListenAndServe(fmt.Sprintf(":%v", *serverPort), nil))
	}

}

func initializeFiles(rootPath string) {

	// initialize the map
	var structures = make([]structure, 0)
	structures = append(structures, structure{Editable: true, Height: 2, Width: 2, Name: "Some Office"})
	var structuresGroups = make([]structuregroup, 0)
	structuresGroups = append(structuresGroups, structuregroup{Type: "office", Structures: structures})
	writeJSONtoFile(rootPath, "map.json", floorplan{Height: 5, Width: 5, StructureGroups: structuresGroups}, false)

	// initialize the employee list
	var employees = make([]employee, 0)
	employees = append(employees, employee{Name: "Some Employee", Structure: "Some Office"})
	writeJSONtoFile(rootPath, "employees.json", employees, false)

	// initialize the employee quotes
	var quotes = make([]quote, 0)
	quotes = append(quotes, quote{Quote: "Some clever quote"})
	writeJSONtoFile(rootPath, "quotes.json", quotes, false)
}

func writeJSONtoFile(rootPath string, fileName string, data interface{}, overwrite bool) {
	var path = rootPath + string(os.PathSeparator) + fileName
	if _, err := os.Stat(path); err == nil {
		if overwrite == false {
			log.Printf("File %v already exists. Skipped writing.", path)
		}
	}

	outbytes, err := json.MarshalIndent(data, "", "\t")
	if err != nil {
		log.Printf("Could not unmarshal to json. Reason: %v", err)
		return
	}

	err = ioutil.WriteFile(path, outbytes, 0644)
	if err != nil {
		log.Printf("Could not write %v/%v. Reason: %v", rootPath, fileName, err)
		return
	}

}

func serveJSON(w http.ResponseWriter, req *http.Request, statusCode int, v interface{}) {

	jsonData, err := json.Marshal(v)
	if err != nil {
		http.Error(w, "Bad json data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonData)
}

func handleDelete(w http.ResponseWriter, req *http.Request, rootPath string) {
	name := req.URL.Query().Get("name")
	employeeList := getEmployeeList(rootPath)

	for i, employee := range employeeList {
		if employee.Name == name {
			log.Printf("Removing employee %v", employee.Name)

			employeeList = employeeList[:i+copy(employeeList[i:], employeeList[i+1:])]
			writeJSONtoFile(rootPath, "employees.json", employeeList, true)
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

func getQuotes(rootPath string) []quote {
	quotes := make([]quote, 0)
	loadJSONFromFile(&quotes, rootPath+"/quotes.json")
	return quotes
}

func getFloorplan(rootPath string) floorplan {
	var f floorplan
	loadJSONFromFile(&f, rootPath+"/map.json")
	return f
}

func getEmployeeList(rootPath string) []employee {
	employeeList := make([]employee, 0)
	loadJSONFromFile(&employeeList, rootPath+"/employees.json")
	return employeeList
}

func handleUpdate(w http.ResponseWriter, req *http.Request, rootPath string) {

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

	//TODO: Make sure the selected structure exists and is editable!
	fp := getFloorplan(rootPath)
	employeeList := getEmployeeList(rootPath)

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

	w.Header().Set("Content-Type", "application/json")

	if len(newEmpInfo.PreviousName) == 0 {
		// new person
		var emp = employee{Name: newEmpInfo.Name, Structure: newEmpInfo.Structure, Photo: newEmpInfo.Photo}
		log.Printf("Adding new person %v", emp)
		employeeList = append(employeeList, emp)
		serveJSON(w, req, http.StatusCreated, newEmpInfo)
	} else {
		// updated person
		for i, employee := range employeeList {
			if (employee.Name == newEmpInfo.PreviousName) || ((employee.Name == newEmpInfo.Name) && len(strings.TrimSpace(newEmpInfo.PreviousName)) == 0) {
				log.Printf("Updating existing %v as %v in %v", employee.Name, newEmpInfo.Name, newEmpInfo.Structure)
				employee.Structure = newEmpInfo.Structure
				employee.Name = newEmpInfo.Name
				employee.Photo = newEmpInfo.Photo
				employeeList[i] = employee
				serveJSON(w, req, http.StatusOK, employee)
				break
			}
		}
	}
	writeJSONtoFile(rootPath, "employees.json", employeeList, true)
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
	Photo     string `json:"photo"`
}

type change struct {
	Name         string `json:"name"`
	Structure    string `json:"structure"`
	PreviousName string `json:"previousname"`
	Photo        string `json:"photo"`
}
