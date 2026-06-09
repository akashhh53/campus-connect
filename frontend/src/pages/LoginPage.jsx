import { useState } from "react";

import { useDispatch }
from "react-redux";

import { useNavigate }
from "react-router";

import {
  setCredentials,
} from "../features/auth/authSlice";

import {
  loginUser,
} from "../services/authService";

const LoginPage = () => {

  const navigate =
    useNavigate();

  const dispatch =
    useDispatch();

  const [
    formData,
    setFormData,
  ] = useState({

    email: "",

    password: "",
  });

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const handleChange =
    (e) => {

      setFormData({

        ...formData,

        [e.target.name]:
          e.target.value,
      });
    };

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      try {

        setLoading(
          true
        );

        setError("");

        const data =
          await loginUser(
            formData
          );

        // Save ONLY through Redux

        dispatch(
          setCredentials(
            data
          )
        );

        navigate(
          "/dashboard"
        );

      } catch (err) {

        console.log(
          err
        );

        setError(

          err.response
            ?.data
            ?.message ||

          "Login failed"
        );

      } finally {

        setLoading(
          false
        );
      }
    };

  return (

    <div
      style={{
        padding:
          "40px",
      }}
    >

      <h1>
        Campus Connect Login
      </h1>

      <form
        onSubmit={
          handleSubmit
        }
      >

        <div>

          <input
            type="email"

            name="email"

            placeholder=
              "Enter email"

            value={
              formData.email
            }

            onChange={
              handleChange
            }
          />

        </div>

        <br />

        <div>

          <input
            type="password"

            name="password"

            placeholder=
              "Enter password"

            value={
              formData.password
            }

            onChange={
              handleChange
            }
          />

        </div>

        <br />

        <button
          type="submit"
        >

          {
            loading

              ? "Logging in..."

              : "Login"
          }

        </button>

      </form>

      {

        error && (

          <p
            style={{
              color:
                "red",
            }}
          >

            {error}

          </p>
        )
      }

    </div>
  );
};

export default LoginPage;