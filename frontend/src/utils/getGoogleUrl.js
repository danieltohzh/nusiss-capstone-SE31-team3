function getGoogleOAuthURL() {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

  const options = {
    // redirect_uri: "http://localhost:8080/api/sessions/oauth/google", // local
    // client_id: "862932998884-c9tcl1vcd8vdfu2qkftqoj0m0cbspt63.apps.googleusercontent.com", // local
    // redirect_uri: "https://api.uat-demo.link/api/sessions/oauth/google", // prod
    // client_id: "644275109199-4roo3pe5l1qog7r577np5km01eduv0s1.apps.googleusercontent.com", // prod
    redirect_uri:  process.env.REACT_APP_NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URL,
    client_id:  process.env.REACT_APP_NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  console.log({options});

  const qs = new URLSearchParams(options);

  console.log(qs.toString());

  return `${rootUrl}?${qs.toString()}`;
}

export default getGoogleOAuthURL;
