/**
 * Wrapper around the ACE editor. The rest of the code base should not use
 * ACE editor directly so it can be easily changed for another editor if required.
 */
class SourceEditor extends qx.ui.core.Widget {

    private aceEditor:Ace.Editor;
    private popup:qx.ui.popup.Popup;
    private autoCompleteView: Cats.UI.AutoCompleteView;
    private container;

    constructor(private session:Cats.AceSession, pos?:Cats.Position) {
        super();
        this.addListenerOnce("appear", () => {
            this.container = this.getContentElement().getDomElement();
            // create the editor
            this.aceEditor = this.createAceEditor(this.container);
            this.aceEditor.getSession().setMode("ace/mode/typescript");
            // this.aceEditor.getSession().setValue(this.getContent());
            this.aceEditor.getSession();
            this.setContent(session.getValue());
            
            this.autoCompleteView = new Cats.UI.AutoCompleteView(this.aceEditor);
             // this.setupInputHandling();
              if (session.mode === "typescript") this.createContextMenu();
              if (pos) this.moveToPosition(pos);
        }, this);
        
        this.popup = new qx.ui.popup.Popup(new qx.ui.layout.Flow());
        this.popup.add(new qx.ui.basic.Label("Code completion"));
  
       
        this.addListener("resize", () => { this.resizeEditor() });
        this.addListener("appear", () => { this.resizeEditor() });
    }

    private resizeEditor() {
         setTimeout(() => {
            this.aceEditor.resize();
        }, 100);
    }

    getSession() : Cats.Session {
        return this.session;
    }
    
    
    private setupEvents() {
        var session = this.aceEditor.getSession();
        session.on("changeOverwrite",(a)=>{
                IDE.infoBus.emit("editor.overwrite",session.getOverwrite());
        });
    }
    
    moveToPosition(pos: Ace.Position) {
        this.aceEditor.moveCursorToPosition(pos);
        this.aceEditor.clearSelection();
        this.aceEditor.centerSelection();
    }

    getPosition() {
        return this.aceEditor.getCursorPosition();
    }

       /**
         * Get the Position based on mouse x,y coordinates
         */
    getPositionFromScreenOffset(x: number, y: number): Ace.Position {
            var r = this.aceEditor.renderer;
            // var offset = (x + r.scrollLeft - r.$padding) / r.characterWidth;
            var offset = (x - r.$padding) / r.characterWidth;

            // @BUG: Quickfix for strange issue with top
            var correction = r.scrollTop ? 7 : 0;

            var row = Math.floor((y + r.scrollTop - correction) / r.lineHeight);
            var col = Math.round(offset);
            
            var docPos = this.aceEditor.getSession().screenToDocumentPosition(row, col);
            return docPos;
        }

        /**
         * Show info at Screen location
         */
        showInfoAt(ev: MouseEvent) {
            // if (this.mode !== "typescript") return;

            var docPos = this.getPositionFromScreenOffset(ev.offsetX, ev.offsetY);
            var project = IDE.project;

            project.iSense.getTypeAtPosition(this.session.name, docPos,
                (err, data: Cats.TypeInfo) => {
                    if (!data) return;
                    var member = data.memberName;
                    if (!member) return;
                    
                    var tip = data.description;
                    if (data.docComment) {
                        tip += "\n" + data.docComment;
                    }
    
                    var tooltip = new qx.ui.tooltip.ToolTip(tip);
                    // this.add(tooltip);
                    tooltip.show();
                    // IDE.mainEditor.toolTip.show(ev.x, ev.y, tip);
                });
        }

     autoComplete() {
            if (this.session.mode === "typescript") {
                var cursor = this.aceEditor.getCursorPosition();
                this.session.autoComplete(cursor, this.autoCompleteView);
            }                        
        }

    autoComplete123() {
        // alert("auto complete");
        var cursor = this.aceEditor.getCursorPosition();
        var coords = this.aceEditor.renderer.textToScreenCoordinates(cursor.row, cursor.column);
        this.popup.moveTo(coords.pageX, coords.pageY);
        this.popup.show();
    }


          // Initialize the editor
        private createAceEditor(rootElement):Ace.Editor {
            var editor: Ace.Editor = ace.edit(rootElement);

            editor.commands.addCommands([
            {
                name: "autoComplete",
                bindKey: {
                    win: "Ctrl-Space",
                    mac: "Ctrl-Space" 
                },
                exec: () => { this.autoComplete() }
            },

           {
                name: "gotoDeclaration",
                bindKey: {
                    win: "F12",
                    mac: "F12"
                },
                exec: () => { Cats.Commands.runCommand(Cats.Commands.CMDS.navigate_declaration) }
            },


            {
                name: "save",
                bindKey: {
                    win: "Ctrl-S",
                    mac: "Command-S"
                },
                exec: () =>  { Cats.Commands.runCommand(Cats.Commands.CMDS.file_save) }
            }
            ]);
 
            var originalTextInput = editor.onTextInput;
            editor.onTextInput = (text) => {
                originalTextInput.call(editor, text);
                if (text === ".") this.autoComplete();
            };

            /*
            var elem = rootElement; // TODo find scroller child
            elem.onmousemove = this.onMouseMove.bind(this);
            elem.onmouseout = () => {
                this.toolTip.hide()
                clearTimeout(this.mouseMoveTimer);
            };
            */

            return editor;
    }

    setContent(value:string) {
        this.aceEditor.getSession().setValue(value);
    }
    
    private createContextMenuItem(name, commandID) {
        var button = new qx.ui.menu.Button(name);
        var command = Cats.Commands.get(commandID).command;
        button.addListener("execute", () =>{
           command();
        });
        return button;
    }
    
    private createContextMenu() {
        var CMDS = Cats.Commands.CMDS;
        var menu = new qx.ui.menu.Menu();
    
        menu.add(this.createContextMenuItem("Goto Declaration", CMDS.navigate_declaration));
        menu.add(this.createContextMenuItem("Find References", CMDS.navigate_references));
        menu.add(this.createContextMenuItem("Find Occurences", CMDS.navigate_occurences));
        menu.add(this.createContextMenuItem("FInd Implementations", CMDS.navigate_implementors));
        
        this.setContextMenu(menu);
    }
  


}