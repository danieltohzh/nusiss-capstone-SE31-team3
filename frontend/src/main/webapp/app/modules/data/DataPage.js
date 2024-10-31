import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Card,
  CardBody,
  FormGroup,
  Row,
  Col,
  FormLabel,
} from "@govtechsg/sgds-react";

function DataPage() {
  console.log("Data page");
  const navigate = useNavigate();
  const location = useLocation();

  let loginState = "";

  // Check if location.state exists before accessing its properties
  if (location.state && location.state.loginState != null) {
    loginState = location.state.loginState;
  }

  return (
    <>
      <div className="container mt-3">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Data Management Page</h4>
              </div>
              {/* Start of Card Body */}
              <div className="card-body">
                {/* Buttons (Start) */}
                <div className="d-flex justify-content-between">
                  <div>
                    <button type="button" className="btn btn-primary">
                      Create Folder
                    </button>
                    <button type="button" className="btn btn-primary">
                      Delete Folder / Image
                    </button>
                  </div>
                  <div>
                    <button type="button" className="btn btn-primary">
                      Upload Folder / Image
                    </button>
                  </div>
                </div>
                {/* Buttons (End) */}
                <div className="form-top-padding">
                  <Card>
                    <CardBody>
                      <FormGroup controlId="scriptManagement">
                        <Row>
                          <h5>Folder / Image</h5>
                        </Row>
                        <Row className="form-top-padding">
                          <Col>
                            <ul>
                              <li><a href="#">Birds Flying past building</a></li>
                              <li><a href="#">Single Bird flying past building</a></li>
                            </ul>
                          </Col>
                        </Row>
                      </FormGroup>
                    </CardBody>
                  </Card>
                </div>
              </div>
              {/* End of Card Body */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DataPage;
