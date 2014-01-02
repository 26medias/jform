(function() {
	var module = function(jform, data) {
		this.jform 	= jform;
		this.data 	= data;
	}
	module.prototype.build = function(line) {
		this.line	= line;
		this.field = window.jformFactory.dom("input", line.field, true);
		this.field.type = "varchar";
		this.field = $(this.field);
		this.field.addClass("form-control");
	}
	module.prototype.validate = function(val) {
		if (this.val().trim() != "") {
			return true;
		}
		return false;
	}
	module.prototype.val = function(val) {
		if (val && val !== false) {
			this.field.val(val);
		} else {
			return this.field.val();
		}
	}
	module.prototype.onUpdate = function(callback) {
		this.field.bind("change", callback);
	}
	module.prototype.remove = function() {
		
	}
	window.jformFactory.register("varchar", module, {
		description:	"Varchar, simple input text, single line.",
		version:		1.0,
		author:			"Julien Loutre <julien@twenty-six-medias.com>"
	});
})();