const font = `/*! system-font.css v1.1.0 | CC0-1.0 License | github.com/jonathantneal/system-font-face */

@font-face {
	font-family: system-ui;
	font-style: normal;
	font-weight: 300;
	src: local(".SFNSText-Light"), local(".HelveticaNeueDeskInterface-Light"), local(".LucidaGrandeUI"), local("Segoe UI Light"), local("Ubuntu Light"), local("Roboto-Light"), local("DroidSans"), local("Tahoma");
}

@font-face {
	font-family: system-ui;
	font-style: italic;
	font-weight: 300;
	src: local(".SFNSText-LightItalic"), local(".HelveticaNeueDeskInterface-Italic"), local(".LucidaGrandeUI"), local("Segoe UI Light Italic"), local("Ubuntu Light Italic"), local("Roboto-LightItalic"), local("DroidSans"), local("Tahoma");
}

@font-face {
	font-family: system-ui;
	font-style: normal;
	font-weight: 400;
	src: local(".SFNSText-Regular"), local(".HelveticaNeueDeskInterface-Regular"), local(".LucidaGrandeUI"), local("Segoe UI"), local("Ubuntu"), local("Roboto-Regular"), local("DroidSans"), local("Tahoma");
}

@font-face {
	font-family: system-ui;
	font-style: italic;
	font-weight: 400;
	src: local(".SFNSText-Italic"), local(".HelveticaNeueDeskInterface-Italic"), local(".LucidaGrandeUI"), local("Segoe UI Italic"), local("Ubuntu Italic"), local("Roboto-Italic"), local("DroidSans"), local("Tahoma");
}

@font-face {
	font-family: system-ui;
	font-style: normal;
	font-weight: 500;
	src: local(".SFNSText-Medium"), local(".HelveticaNeueDeskInterface-MediumP4"), local(".LucidaGrandeUI"), local("Segoe UI Semibold"), local("Ubuntu Medium"), local("Roboto-Medium"), local("DroidSans-Bold"), local("Tahoma Bold");
}

@font-face {
	font-family: system-ui;
	font-style: italic;
	font-weight: 500;
	src: local(".SFNSText-MediumItalic"), local(".HelveticaNeueDeskInterface-MediumItalicP4"), local(".LucidaGrandeUI"), local("Segoe UI Semibold Italic"), local("Ubuntu Medium Italic"), local("Roboto-MediumItalic"), local("DroidSans-Bold"), local("Tahoma Bold");
}

@font-face {
	font-family: system-ui;
	font-style: normal;
	font-weight: 700;
	src: local(".SFNSText-Bold"), local(".HelveticaNeueDeskInterface-Bold"), local(".LucidaGrandeUI"), local("Segoe UI Bold"), local("Ubuntu Bold"), local("Roboto-Bold"), local("DroidSans-Bold"), local("Tahoma Bold");
}

@font-face {
	font-family: system-ui;
	font-style: italic;
	font-weight: 700;
	src: local(".SFNSText-BoldItalic"), local(".HelveticaNeueDeskInterface-BoldItalic"), local(".LucidaGrandeUI"), local("Segoe UI Bold Italic"), local("Ubuntu Bold Italic"), local("Roboto-BoldItalic"), local("DroidSans-Bold"), local("Tahoma Bold");
}`;

const html = s => `<meta name="viewport" content="width=device-width"><style>${font} body {
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  font-family: system-ui;
  align-items: center;
  justify-content: center;
  display: flex; }</style>${s}`;

// eslint-disable-next-line no-unused-vars
module.exports = (error, req, res, next) => {
  if (req.accepts('json')) {
    return res
      .status(error.status)
      .json({ message: error.message, stack: error.stack });
  }
  res.status(error.status).send(html(error.message));
};
