from google.appengine.ext import db


class CompanyModel(db.Model):
 companyaddedby     = db.UserProperty(required=True)
 companyname        = db.StringProperty()
 companytel         = db.StringProperty()
 companymail        = db.StringProperty()
 companywebsite     = db.StringProperty()
 companyaddress     = db.StringProperty(multiline=True)
 companywilaya      = db.StringProperty()
 companydescription = db.StringProperty(multiline=True)
 companydateadded   = db.DateTimeProperty(auto_now_add=True)
 