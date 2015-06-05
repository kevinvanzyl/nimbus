**Share locations** with your Google+ contacts. This application uses **Auth0** for authentication and to get a Java Web Token for **Google+ People API** using OAuth 2.0 credentials. It uses a **Firebase** backend. It uses **AngularJS** and this is my first Angular project. I have written out some setup instructions below. For now just copy the entire directory but I will use a package manager very soon.

# **Auth0**

[Create a new account on Auth0](https://auth0.com/).
Create a new project.
Follow the tutorial to learn a bit about it then when you are ready to setup, use this screenshot to help you configure it.

![](https://drive.google.com/uc?export=view&id=0Byi_8e23d5NTSEtxMEtUYTB5Rms)

Now you will need to add a social connection for Google. Before you do that you should go to your Google Developer Console and configure it to look like below screenshot:

![](https://drive.google.com/uc?export=view&id=0Byi_8e23d5NTU05LMVJYdlVvS1E)

After that go back to Auth0 and configure this connection in **Social Connections > Google**.
You should have something like below.

![](https://drive.google.com/uc?export=view&id=0Byi_8e23d5NTOTRGa3l6TFhOY0k)

Ok now you should have authentication done. Obviously these client IDs and secrets will be different to yours but I presented them like this for consistency.

Now we need to open **application/js/app.js** and configure our authentication in our app.

Find this code:

	authProvider.init({
		domain: 	'glaring-torch-8505.auth0.com',
		clientID: 	'raHAbislnzmyQUBxhI5DCMin3gt8bCWd',
		callbackURL: 	location.href,
		loginUrl: 	'/login'
	});

Change these values to your auth0 details.

# **Firebase**

[Create a new project on Firebase](https://firebase.com/).
Setup the data as below.

![](https://drive.google.com/uc?export=view&id=0Byi_8e23d5NTaEtfaWs5U0trdlE)

# **Lastly**

Open **application/js/app.js**
Find **nimbus.value('firebaseBase, ...** and set it to your firebase endpoint.

**Hosting:** Follow these instructions to host on Firebase. 
Go back to **auth0** application settings and change **Allowed Callback URLs** accordingly.
Go back to your **Google Console** credentials and set it in **Javascript Origins** as well.

> You should be all set up now. 

# **Future direction**


* I will be working on this continuously and will be adding more social providers like Facebook and Twitter.
* I will also be rebuilding the UI with Ionic and adding customizations for users.
* I will be adding authentication for firebase and rules.
* I will also be doing some optimizations, cleanup and refactoring as I learn more about AngularJS.
* I want to use bower and I also want to integrate a testing framework.
* Phonegap / Cordova

So it is still quite young. 
