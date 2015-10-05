var WDBManager = (function(){
    "use strict";
    var pool = {};

    class WSQLHandler
    {

        constructor(pName, pVersion, pComment, pSize)
        {
            this.db = null;
            this.models = [];
            this.name = pName;
            this.version = pVersion;
            this.comment = pComment;
            this.size = pSize;
        }

        registerModel(pModel)
        {
            this.models.push(pModel);
            return this;
        }

        open()
        {
            if(!openDatabase)
                return;
            this.db = openDatabase(this.name, this.version, this.comment, this.size, this.createdHandler.proxy(this));
        }

        createdHandler()
        {
            console.log(this);
            for(let i = 0, max = this.models.length; i<max;i++)
            {
                let q = this.models[i].create();
                if(q == false)
                    continue;
                this.execute(q);
            }
        }

        execute(pQuery, pSucceed, pFailed)
        {
            this.db.transaction(function(pTrans)
            {
                console.log(pQuery);
                pTrans.executeSql(pQuery, [], pSucceed, pFailed);
            });
        }
    }

    return {
        set:function(pName, pVersion, pComment, pSize)
        {
            return new WSQLHandler(pName, pVersion, pComment, pSize);
        },
        get:function(pName)
        {
            if(!pool[pName])
                return false;
            return pool[pName];
        }
    };

})();