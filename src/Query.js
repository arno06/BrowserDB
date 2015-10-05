/**
 * @author Arnaud NICOLAS - arno06@gmail.com
 */
var Query = (function(){
    "use strict";
    class BaseQuery
    {
        constructor()
        {

        }

        toString()
        {
            throw new Error('Must be overiden');
        }

        execute(pHandler)
        {
            return pHandler.execute(this.toString());
        }
    }

    class InsertQuery extends BaseQuery
    {
        static get UNIQUE(){return 1;}
        static get MULTIPLE(){return 2;}

        constructor(pValues, pType)
        {
            super();
            switch(pType)
            {
                case InsertQuery.MULTIPLE:
                    this.fields = pValues[0]||{};
                    this.values = pValues;
                    break;
                case InsertQuery.UNIQUE:
                default:
                    this.fields = pValues;
                    this.values = [pValues];
                    break;
            }
        }

        set fields(pFirstTuple)
        {
            this._fields = [];
            for(var i in pFirstTuple)
            {
                if(!pFirstTuple.hasOwnProperty(i))
                    continue;
                this._fields.push(i);
            }

        }

        set values(pValues)
        {
            this._values = [];
            for(let i = 0, max = pValues.length; i<max; i++)
            {
                let v = [];
                for(let j = 0, maxj = this._fields.length; j<maxj;j++)
                {
                    let f = this._fields[j];
                    if(!pValues[i].hasOwnProperty(f))
                        v.push(Query.escapeValue(''));
                    else
                        v.push(Query.escapeValue(pValues[i][f]));
                }
                this._values.push("("+v.join(", ")+")");
            }
        }

        into(pTable)
        {
            this.table = pTable;
            return this;
        }

        toString()
        {
            return "INSERT INTO "+this.table+" ("+this._fields.join(", ")+") VALUES "+(this._values.join(", "))+";";
        }
    }

    class QueryCondition
    {
        constructor()
        {
            this.ands = [];
            this.ors = [];
            this.havingAnds = [];
            this.havingOrs = [];
            this.existsAnds = [];
            this.existsOrs = [];
            this.order = "";
            this.limitOn = "";
            this.group = "";
        }

        andExists(pQuery)
        {
            this.existsAnds.push("EXISTS ("+pQuery.toString()+")");
            return this;
        }

        orExists(pQuery)
        {
            this.existsOrs.push("EXISTS ("+pQuery.toString()+")");
            return this;
        }

        andNotExists(pQuery)
        {
            this.existsAnds.push("NOT EXISTS ("+pQuery.toString()+")");
            return this;
        }

        orNotExists(pQuery)
        {
            this.existsOrs.push("OR EXISTS ("+pQuery.toString()+")");
            return this;
        }

        orWhere(pField, pOperator, pValue, pEscape)
        {
            pEscape = pEscape||true;
            if(pEscape != false)
                pValue = Query.escapeValue(pValue);
            if(pOperator == Query.MATCH)
            {
                this.ors.push("MATCH("+pField+") AGAINST ("+pValue+")");
            }
            else
            {
                this.ors.push(pField+pOperator+pValue);
            }
            return this;
        }

        andWhere(pField, pOperator, pValue, pEscape)
        {
            pEscape = pEscape||true;
            if(pEscape != false)
                pValue = Query.escapeValue(pValue);
            this.ands.push(pField+pOperator+pValue);
            return this;
        }

        andHaving(pField)
        {
            this.havingAnds.push(Query.escapeValue(pField));
            return this;
        }

        orHaving(pField)
        {
            this.havingOrs.push(Query.escapeValue(pField));
            return this;
        }

        groupBy(pField)
        {
            this.group = " GROUP BY "+pField;
        }

        limit(pOffset, pCount)
        {
            this.limitOn = " LIMIT "+pOffset+", "+pCount;
            return this;
        }

        orderBy(pField, pBy)
        {
            if(this.order == "")
            {
                this.order = " ORDER BY "+pField+" "+pBy;
            }
            else
            {
                this.order += ", "+pField+" "+pBy;
            }
            return this;
        }

        andCondition(pCondition)
        {
            this.ands.push("("+pCondition.toString().replace(/^ WHERE /i, '')+")");
            return this;
        }

        orCondition(pCondition)
        {
            this.ors.push("("+pCondition.toString().replace(/^ WHERE /i, '')+")");
            return this;
        }

        toString()
        {
            return this.getWhere()+this.group+this.getHaving()+this.order+this.limitOn;
        }

        getWhere()
        {
            let where = "";
            let ands = this.ands.join(' AND ');
            let ors = this.ors.join(' OR ');
            let existsAnds = this.existsAnds.join(' AND ');
            let existsOrs = this.existsOrs.join(' OR ');
            if(ands != "")
                where += " WHERE "+ands;

            if(ors != "")
            {
                where += (where==""?" WHERE ":" OR ")+ors;
            }
            if(existsAnds != "")
            {
                where += (where == ""?" WHERE ":" AND ")+existsAnds;
            }
            if(existsOrs != "")
            {
                where += (where == ""?" WHERE ":" AND ")+existsOrs;
            }
            return where;
        }

        getHaving()
        {
            let having = "";
            let ands = this.havingAnds.join(' AND ');
            let ors = this.havingOrs.join(' OR ');
            if(ands != "")
                having += " HAVING "+ands;
            if(ors != "")
            {
                having += (having == ""?" HAVING ":" OR ")+ors;
            }
            return having;
        }
    }

    class QueryWithCondition extends BaseQuery
    {
        constructor()
        {
            super();
            this._condition = null;
        }

        /**
         * @returns {QueryCondition}
         */
        get condition()
        {
            if(!this._condition)
                this._condition = new QueryCondition();
            return this._condition;
        }

        andWhere(pField, pOperator, pValue, pEscape)
        {
            this.condition.andWhere(pField, pOperator, pValue, pEscape);
            return this;
        }

        orWhere(pField, pOperator, pValue, pEscape)
        {
            this.condition.orWhere(pField, pOperator, pValue, pEscape);
            return this;
        }

        andHaving(pField)
        {
            this.condition.andHaving(pField);
            return this;
        }

        orHaving(pField)
        {
            this.condition.orHaving(pField);
            return this;
        }

        andExists(pQuery)
        {
            this.condition.andExists(pQuery);
            return this;
        }

        orExists(pQuery)
        {
            this.condition.orExists(pQuery);
            return this;
        }

        andNotExists(pQuery)
        {
            this.condition.andNotExists(pQuery);
            return this;
        }

        orNotExists(pQuery)
        {
            this.condition.orNotExists(pQuery);
            return this;
        }

        orderBy(pField, pBy)
        {
            this.condition.orderBy(pField, pBy);
            return this;
        }

        groupBy(pField)
        {
            this.condition.groupBy(pField);
            return this;
        }

        limit(pOffset, pCount)
        {
            this.condition.limit(pOffset, pCount);
            return this;
        }
    }

    class TruncateQuery extends BaseQuery
    {
        constructor(pTable)
        {
            super();
            this.table = pTable;
        }

        toString()
        {
            return "TRUNCATE TABLE '"+this.table+"';";
        }
    }

    class DeleteQuery extends QueryWithCondition
    {
        from(pTable)
        {
            this.table = pTable;
            return this;
        }

        toString()
        {
            return "DELETE FROM "+this.table+this.condition.toString()+";";
        }
    }

    class UpdateQuery extends QueryWithCondition
    {
        constructor(pTable)
        {
            super();
            this.table = pTable;
        }

        values(pValues)
        {
            this._values = [];
            for(let i in pValues)
            {
                if(!pValues.hasOwnProperty(i))
                    continue;
                this._values.push(i+"="+Query.escapeValue(pValues[i]))
            }
            return this;
        }

        toString()
        {
            return "UPDATE "+this.table+" SET "+(this._values.join(", "))+(this.condition.toString())+";";
        }
    }

    class SelectQuery extends QueryWithCondition
    {
        constructor(pFields, pTable)
        {
            super();//Without it, this is undefined
            this.fields = [pFields];
            this.tables = [pTable];
            this.joins = "";
            this.queryUnions = [];
        }

        addFrom(pFields, pTable)
        {
            this.fields.push(pFields);
            this.tables.push(pTable);
        }

        join(pTable, pType, pOn)
        {
            pOn = pOn||"";
            pType = pType||Query.JOIN_NATURAL;
            if(pOn != "")
            {
                pOn = " ON "+pOn;
            }
            this.joins += pType+pTable+pOn;
            return this;
        }

        toString(pSemicolon)
        {
            pSemicolon = pSemicolon||true;
            let query = "SELECT "+(this.fields.join(", "))+" FROM "+(this.tables.join(", "))+" "+this.joins+this.condition.toString();
            if(pSemicolon)
                query += ";";
            return query;
        }
    }


    return {
        JOIN:" JOIN ",
        JOIN_NATURAL:" JOIN NATURAL ",
        JOIN_INNER:" INNER JOIN ",
        JOIN_OUTER_FULL:" FULL OUTER JOIN ",
        JOIN_OUTER_LEFT:" LEFT OUTER JOIN ",
        JOIN_OUTER_RIGHT:" RIGHT OUTER JOIN ",
        JOIN_CROSS:" CROSS JOIN ",
        JOIN_UNION:" UNION JOIN ",
        IS:" IS ",
        IS_NOT:" IS NOT ",
        LIKE:" LIKE ",
        MATCH:" MATCH ",
        EQUAL:" = ",
        NOT_EQUAL:" != ",
        UPPER:" > ",
        LOWER:" < ",
        UPPER_EQUAL:" >= ",
        LOWER_EQUAL:" <= ",
        select:function(pFields, pTable){
            return new SelectQuery(pFields, pTable);
        },
        insert:function(pValues)
        {
            return new InsertQuery(pValues, InsertQuery.UNIQUE);
        },
        insertMultiple:function(pValues)
        {
            return new InsertQuery(pValues, InsertQuery.MULTIPLE);
        },
        update:function(pTable)
        {
            return new UpdateQuery(pTable);
        },
        delete:function()
        {
            return new DeleteQuery();
        },
        condition:function()
        {
            return new QueryCondition();
        },
        truncate:function(pTable)
        {
            return new TruncateQuery(pTable);
        },
        escapeValue:function(pValue)
        {
            return "'"+pValue+"'";
        }
    };
})();