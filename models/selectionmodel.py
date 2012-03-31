from google.appengine.ext import db

from company import CompanyModel
from modelespace import EspaceModel
from tagmodel import TagModel


class SelectionView:
    pass
class SelectionModel(db.Model):
  espace = db.ReferenceProperty(EspaceModel,
      collection_name = 'espaceselection')
  company = db.ReferenceProperty(CompanyModel,
      collection_name = 'companyselection')
  tag = db.ReferenceProperty(TagModel,
      collection_name = 'tagselection')
  selectedby     = db.UserProperty(required=True)
  dateselected   = db.DateTimeProperty(auto_now_add=True)


  @classmethod
  def getSelectionByEspaceID(self,id):
        companies_query = CompanyModel.all().order('-companydateadded')
        companies = companies_query.fetch(1000)
        espaceid = int(id)
	espace = EspaceModel.get_by_id(espaceid)
        selectionsview = list()
		
        for company in companies:
            selectionview = SelectionView()
	    selectionview.company = company
	    companyid = company.key().id_or_name()
            
            selectionview.tags = SelectionModel.getAllTagsForCompanyInThisEspace(espaceid,companyid)
            selectionsview.append(selectionview)
            
        return selectionsview
  
  
  @classmethod
  def getAllTagsForCompanyInThisEspace(self,espaceid, companyid):
    espace = EspaceModel.get_by_id(espaceid)
    company = CompanyModel.get_by_id(companyid)
    selectionsforcompany_query = SelectionModel.all().filter('espace = ',espace).filter('company = ',company)
    selectionsforcompany = selectionsforcompany_query.fetch(1000)
    tags = list()
    for selection in selectionsforcompany:
      tags.append(selection.tag)

    return tags
  



